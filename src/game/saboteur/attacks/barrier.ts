import { createObstacleView } from "../obstacle-view";
import type { AttackDef } from "../../../shared/attacks";

/** A wall across one lane: must be dodged, can't be jumped. */
export const barrier: AttackDef = {
  id: "barrier",
  name: "Barrier",
  color: 0xff5252,
  fire(world, lane) {
    world.spawnObstacle({
      createView: (scene, x, y) => createObstacleView(scene, x, y, "barrier", 140, 50),
      kind: "barrier",
      lane,
      jumpable: false,
      effect: "end-run",
      height: 50,
      color: 0xff5252,
    });
  },
};
