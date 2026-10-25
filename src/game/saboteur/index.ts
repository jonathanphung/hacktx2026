import { GIANT_RELEASE_Y } from "../../shared/combat";
import { acceptsPlayerInput } from "../../shared/match";
import type Phaser from "phaser";
import { untilShutdown } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import { GAME_HEIGHT, type Lane } from "../../shared/types";
import { saboteurBus, type GameEvents, type World } from "../../shared/world";
import { ATTACK_BY_ID } from "./attacks";
import { SABOTEUR } from "./config";
import { AttackRotation } from "./rotation";
import { createRotationPreview } from "./rotation-view";
import { GiantInventory } from "./inventory";

import { createGiantHand } from "./giant-hand";

const GLOW_WIDTH = 160;
const GLOW_ALPHA = 0.22;
const GLOW_LOCK_ALPHA = 0.4;
/** Time constants (ms) for the aim indicators gliding between lanes. */
const GLOW_EASE_MS = 40;
const MARKER_EASE_MS = 70;

/** Player 2: aims the next obstacle in a repeating rotation and drops it every three seconds into the runner's world. */
export function installSaboteur(scene: Phaser.Scene, world: World): void {
  const rotation = new AttackRotation();
  const inventory = new GiantInventory(() => rotation.next());
  const preview = createRotationPreview(scene);
  let aimLane: Lane = 1;
  let now = -1;
  let nextFire = 0;
  let over = false;
  const pending: {
    id: string;
    lane: Lane;
    landsAt: number;
    warning: Phaser.GameObjects.Rectangle;
    hand: ReturnType<typeof createGiantHand>;
  }[] = [];

  const clearWarnings = () => {
    for (const attack of pending) {
      attack.warning.destroy();
      attack.hand.destroy();
    }
    pending.length = 0;
  };
  untilShutdown(scene, clearWarnings);
  untilShutdown(
    scene,
    world.events.on("game-over", () => {
      over = true;
      clearWarnings();
      bufferedFire = null;
      publish("saboteur-status", status(now));
    }),
  );

  /** Authoritative saboteur state, mirrored on saboteurBus for UI that outlives a run. */
  function publish<K extends "saboteur-status" | "cast-result">(name: K, payload: GameEvents[K]) {
    world.events.emit(name, payload);
    saboteurBus.emit(name, payload);
  }
  function status(time: number): GameEvents["saboteur-status"] {
    if (over) return { state: "over", remainingMs: 0, aimLane };
    if (pending.length) {
      const next = Math.min(...pending.map((attack) => attack.landsAt));
      return { state: "queued", remainingMs: Math.max(0, next - time), aimLane };
    }
    const remainingMs = Math.max(
      0,
      nextFire - time,
      inventory.cards.length ? 0 : inventory.wait(time),
    );
    if (remainingMs > 0) return { state: "cooldown", remainingMs, aimLane };
    return { state: "ready", remainingMs: 0, aimLane };
  }
  const reject = (reason: "cooldown" | "starting" | "game-over", remainingMs = 0) =>
    publish("cast-result", { accepted: false, reason, lane: aimLane, remainingMs });
  let lastState: GameEvents["saboteur-status"]["state"] = "ready";

  const marker = scene.add.triangle(world.laneX(aimLane), 90, 0, 0, 40, 0, 20, 30, 0xff5252);
  marker.setDepth(10);
  // The target lane lights up the instant aim changes; the marker above eases over after it.
  const glow = scene.add
    // Keep fill opaque: object alpha alone controls the idle/cast pulse. Applying both
    // fillAlpha and alpha multiplied them after the first cast and hid the aiming lane.
    .rectangle(world.laneX(aimLane), GAME_HEIGHT / 2, GLOW_WIDTH, GAME_HEIGHT, 0xff5252, 1)
    .setAlpha(GLOW_ALPHA)
    .setDepth(8);

  const announce = () => {
    preview(inventory.cards, rotation.peek(1));
    world.events.emit("hand-changed", {
      hand: [...inventory.cards],
      selected: 0,
      aimLane,
    });
    publish("saboteur-status", status(now));
  };

  const cast = (lane: Lane) => {
    const id = inventory.take(now);
    if (!id) return;
    nextFire = now + 1700;
    glow.setAlpha(GLOW_LOCK_ALPHA);
    scene.tweens.add({ targets: glow, alpha: GLOW_ALPHA, duration: 300 });
    publish("cast-result", {
      accepted: true,
      attackId: id,
      lane,
      remainingMs: Math.max(1700, inventory.cards.length ? 0 : inventory.wait(now)),
    });
    const warning = scene.add.rectangle(
      world.laneX(lane),
      GIANT_RELEASE_Y,
      80,
      80,
      ATTACK_BY_ID.get(id)!.color,
      0.3,
    );
    warning.setDepth(9);
    const hand = createGiantHand(
      scene,
      world.laneX(lane),
      ATTACK_BY_ID.get(id)!.color,
      SABOTEUR.warningMs,
      id,
    );
    pending.push({ id, lane: lane, landsAt: now + SABOTEUR.warningMs, warning, hand });
  };
  let bufferedFire: Lane | null = null;

  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (scene.sys?.isPaused()) return;
      if (e.player !== "saboteur") return;
      if (!acceptsPlayerInput(e.player, e.source)) return;
      if (over) {
        if (e.action === "fire") reject("game-over");
        return;
      }
      if (e.action === "aim") {
        aimLane = e.lane;
        // Marker and glow glide toward the new lane each frame (see update) instead of snapping.
      } else if (e.action === "fire") {
        if (now < 0) return reject("starting");
        const readyAt = Math.max(
          nextFire,
          inventory.cards.length ? now : now + inventory.wait(now),
        );
        if (now < readyAt) {
          // Gestures land a little early as often as a little late: hold a fire that arrives
          // just before the cooldown ends and cast it the moment it does, at the lane aimed.
          if (readyAt - now <= SABOTEUR.fireBufferMs) bufferedFire = aimLane;
          else return reject("cooldown", readyAt - now);
          return;
        }
        cast(aimLane);
      }
      announce();
    }),
  );

  let lastFrame = -1;
  const update = (time: number) => {
    if (over) return;
    // Exponential easing on the game clock: the glow leads, the marker follows a beat behind.
    const dt = lastFrame < 0 ? 0 : Math.min(100, time - lastFrame);
    lastFrame = time;
    const target = world.laneX(aimLane);
    glow.x += (target - glow.x) * (1 - Math.exp(-dt / GLOW_EASE_MS));
    marker.x += (target - marker.x) * (1 - Math.exp(-dt / MARKER_EASE_MS));
    const wasCooling = nextFire > 0 && now < nextFire;
    now = time;
    if (inventory.update(now) || (wasCooling && now >= nextFire)) announce();
    if (bufferedFire !== null && now >= nextFire && inventory.cards.length) {
      const lane = bufferedFire;
      bufferedFire = null;
      cast(lane);
      announce();
    }
    for (let i = pending.length - 1; i >= 0; i--) {
      const attack = pending[i];
      if (time < attack.landsAt) continue;
      pending.splice(i, 1);
      attack.warning.destroy();
      attack.hand.release();
      ATTACK_BY_ID.get(attack.id)!.fire(world, attack.lane);
      world.events.emit("attack-fired", { attackId: attack.id, lane: attack.lane });
      if (over) return;
    }
    // Re-publish every frame while a countdown runs, and once more when it ends.
    const next = status(time);
    if (next.state !== lastState || next.remainingMs > 0) publish("saboteur-status", next);
    lastState = next.state;
  };
  scene.events.on("update", update);
  untilShutdown(scene, () => scene.events.off("update", update));

  untilShutdown(
    scene,
    world.events.on("stage-changed", ({ index }) => {
      inventory.grow(index);
      announce();
    }),
  );
  announce();
}
