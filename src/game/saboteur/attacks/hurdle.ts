import { createObstacleView } from "../obstacle-view";
import type { AttackDef } from "../../../shared/attacks";

/** A rolling log: jump cleanly for a bonus, or dodge it. */
export const hurdle: AttackDef = {
  id: "hurdle",
  name: "Rolling Log",
  color: 0xffb74d,
  fire(world, lane) {
    world.spawnObstacle({
      createView: (scene, x, y) => createObstacleView(scene, x, y, "hurdle", 140, 24),
      kind: "hurdle",
      lane,
      jumpable: true,
      effect: "end-run",
      width: 140,
      height: 24,
      color: 0xffb74d,
    });
  },
};
