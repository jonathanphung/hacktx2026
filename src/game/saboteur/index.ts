import type Phaser from "phaser";
import { untilShutdown } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import type { Lane } from "../../shared/types";
import type { World } from "../../shared/world";
import { ATTACK_BY_ID, ATTACKS } from "./attacks";
import { SABOTEUR } from "./config";

import { createGiantHand } from "./giant-hand";

/** Player 2: aims one random obstacle and drops it every four seconds into the runner's world. */
export function installSaboteur(scene: Phaser.Scene, world: World): void {
  // One physical obstacle per throw: double-wall is intentionally outside this pool.
  const pool = ATTACKS.filter((attack) => attack.id !== "double-wall");
  const draw = () => pool[Math.floor(Math.random() * pool.length)].id;
  let nextAttack = draw();
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
    world.events.emit("hand-changed", {
      hand: nextFire > 0 && now < nextFire ? [] : [nextAttack],
      selected: 0,
      aimLane,
    });

  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (scene.sys?.isPaused()) return;
      if (over || e.player !== "saboteur") return;
      if (e.action === "aim") {
        aimLane = e.lane;
        scene.tweens.add({ targets: marker, x: world.laneX(aimLane), duration: 100 });
      } else if (e.action === "fire") {
        if (now < 0 || now < nextFire) return;
        const id = nextAttack;
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
          id,
        );
        pending.push({ id, lane: aimLane, landsAt: now + SABOTEUR.warningMs, warning, hand });
      }
      announce();
    }),
  );

  const update = (time: number) => {
    if (over) return;
    const wasCooling = nextFire > 0 && now < nextFire;
    now = time;
    if (wasCooling && now >= nextFire) {
      nextAttack = draw();
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
  };
  scene.events.on("update", update);
  untilShutdown(scene, () => scene.events.off("update", update));

  announce();
}
