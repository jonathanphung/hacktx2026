import { createObstacleView } from "../obstacle-view";
import type { AttackDef } from "../../../shared/attacks";

/** A burning projectile aimed straight down one lane. Dodge rather than jump. */
export const fireball: AttackDef = {
  id: "fireball",
  name: "Fireball",
  color: 0xff8c42,
  fire(world, lane) {
    world.spawnObstacle({
      kind: "fireball",
      lane,
      jumpable: false,
      effect: "end-run",
      width: 64,
      height: 72,
      color: 0xff8c42,
      createView: (scene, x, y) => createObstacleView(scene, x, y, "fireball", 64, 72),
    });
  },
};
