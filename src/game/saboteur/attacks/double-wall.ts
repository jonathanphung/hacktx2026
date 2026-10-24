import { createObstacleView } from "../obstacle-view";
import type { AttackDef } from "../../../shared/attacks";
import type { Lane } from "../../../shared/types";

/** Blocks the aimed lane and one neighbor, leaving one escape lane. */
export const doubleWall: AttackDef = {
  id: "double-wall",
  name: "Double wall",
  color: 0xef5350,
  fire(world, lane) {
    const neighbor: Lane = lane === 2 ? 1 : ((lane + 1) as Lane);
    for (const target of [lane, neighbor]) {
      world.spawnObstacle({
        createView: (scene, x, y) => createObstacleView(scene, x, y, "double-wall", 140, 50),
        kind: "double-wall",
        lane: target,
        jumpable: false,
        effect: "end-run",
        height: 50,
        color: 0xef5350,
      });
    }
  },
};
