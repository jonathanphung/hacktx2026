import Phaser from "phaser";
import { untilShutdown } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import type { Lane } from "../../shared/types";
import type { World } from "../../shared/world";
import { ATTACK_BY_ID, ATTACKS } from "./attacks";
import { SABOTEUR } from "./config";
import { Deck } from "./deck";

/** Player 2: draws random attack cards, aims at a lane, and fires them into the runner's world. */
export function installSaboteur(scene: Phaser.Scene, world: World): void {
  const deck = new Deck(
    ATTACKS.map((a) => a.id),
    SABOTEUR,
  );
  let aimLane: Lane = 1;

  const marker = scene.add.triangle(world.laneX(aimLane), 90, 0, 0, 40, 0, 20, 30, 0xff5252);
  marker.setDepth(10);

  const announce = () =>
    world.events.emit("hand-changed", { hand: [...deck.hand], selected: deck.selected, aimLane });

  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (e.player !== "saboteur") return;
      if (e.action === "aim") {
        aimLane = e.lane;
        scene.tweens.add({ targets: marker, x: world.laneX(aimLane), duration: 100 });
      } else if (e.action === "select") {
        deck.select(e.slot);
      } else if (e.action === "fire") {
        const id = deck.take();
        if (!id) return;
        ATTACK_BY_ID.get(id)!.fire(world, aimLane);
        world.events.emit("attack-fired", { attackId: id, lane: aimLane });
      }
      announce();
    }),
  );

  const update = (time: number) => {
    if (deck.update(time)) announce();
  };
  scene.events.on("update", update);
  untilShutdown(scene, () => scene.events.off("update", update));

  announce();
}
