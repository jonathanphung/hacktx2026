import type { AttackDef } from "../../../shared/attacks";

/** A low hurdle: jump it or dodge it. */
export const hurdle: AttackDef = {
  id: "hurdle",
  name: "Hurdle",
  color: 0xffb74d,
  fire(world, lane) {
    world.spawnObstacle({
      kind: "hurdle",
      lane,
      jumpable: true,
      effect: "end-run",
      height: 24,
      color: 0xffb74d,
    });
  },
};
