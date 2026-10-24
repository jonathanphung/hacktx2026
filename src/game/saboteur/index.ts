import type Phaser from "phaser";
import { untilShutdown } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import type { Lane } from "../../shared/types";
import type { World } from "../../shared/world";
import { ATTACK_BY_ID, ATTACKS } from "./attacks";
import { SABOTEUR } from "./config";
import { Deck } from "./deck";
import { createGiantHand } from "./giant-hand";

/** Player 2: draws random attack cards, aims at a lane, and fires them into the runner's world. */
export function installSaboteur(scene: Phaser.Scene, world: World): void {
  const deck = new Deck(
    ATTACKS.map((a) => a.id),
    SABOTEUR,
  );
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
    }),
  );

  const marker = scene.add.triangle(world.laneX(aimLane), 90, 0, 0, 40, 0, 20, 30, 0xff5252);
  marker.setDepth(10);

  const announce = () =>
    world.events.emit("hand-changed", { hand: [...deck.hand], selected: deck.selected, aimLane });

  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (scene.sys?.isPaused()) return;
      if (over || e.player !== "saboteur") return;
      if (e.action === "aim") {
        aimLane = e.lane;
        scene.tweens.add({ targets: marker, x: world.laneX(aimLane), duration: 100 });
      } else if (e.action === "select") {
        deck.select(e.slot);
      } else if (e.action === "fire") {
        if (now < 0 || now < nextFire) return;
        const id = deck.take();
        if (!id) return;
        nextFire = now + SABOTEUR.fireCooldownMs;
        const warning = scene.add.rectangle(
          world.laneX(aimLane),
          40,
          80,
          80,
          ATTACK_BY_ID.get(id)!.color,
          0.3,
        );
        warning.setDepth(9);
        const hand = createGiantHand(
          scene,
          world.laneX(aimLane),
          ATTACK_BY_ID.get(id)!.color,
          SABOTEUR.warningMs,
        );
        pending.push({ id, lane: aimLane, landsAt: now + SABOTEUR.warningMs, warning, hand });
      }
      announce();
    }),
  );

  const update = (time: number) => {
    if (over) return;
    now = time;
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
    if (deck.update(time)) announce();
  };
  scene.events.on("update", update);
  untilShutdown(scene, () => scene.events.off("update", update));

  announce();
}
