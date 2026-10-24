import type { AttackDef } from "../../../shared/attacks";

/** A long patch that slows even airborne runners. Switch lanes to avoid it. */
export const mud: AttackDef = {
  id: "mud",
  name: "Mud patch",
  color: 0x8d6e63,
  fire(world, lane) {
    world.spawnObstacle({
      kind: "mud",
      lane,
      jumpable: false,
      effect: "slow",
      height: 150,
      color: 0x8d6e63,
    });
  },
};
