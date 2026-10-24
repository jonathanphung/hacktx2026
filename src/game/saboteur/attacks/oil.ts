import type { AttackDef } from "../../../shared/attacks";

/** An oil slick: doesn't end the run, but slows the runner for a moment. */
export const oil: AttackDef = {
  id: "oil",
  name: "Oil slick",
  color: 0x9575cd,
  fire(world, lane) {
    world.spawnObstacle({
      kind: "oil",
      lane,
      jumpable: true,
      effect: "slow",
      height: 70,
      color: 0x5e35b1,
    });
  },
};
