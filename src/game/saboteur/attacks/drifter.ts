import { createObstacleView } from "../obstacle-view";
import type { AttackDef } from "../../../shared/attacks";
import { SABOTEUR } from "../config";
import type { Lane } from "../../../shared/types";

/** A jumpable obstacle that sweeps to a neighboring lane as it approaches. */
export const drifter: AttackDef = {
  id: "drifter",
  name: "Drifter",
  color: 0x26c6da,
  fire(world, lane) {
    const destination: Lane = lane === 2 ? 1 : ((lane + 1) as Lane);
    world.spawnObstacle({
      kind: "drifter",
      lane,
      jumpable: true,
      effect: "end-run",
      width: 60,
      height: 30,
      color: 0x26c6da,
      createView(scene, x, y) {
        const view = createObstacleView(scene, x, y, "drifter", 60, 30);
        let startedAt: number | undefined;
        const update = (time: number) => {
          startedAt ??= time;
          const progress = Math.min(1, (time - startedAt) / SABOTEUR.driftMs);
          view.x = x + (world.laneX(destination) - x) * progress;
        };
        scene.events.on("update", update);
        const unsubscribe = () => {
          scene.events.off("update", update);
          scene.events.off("shutdown", unsubscribe);
        };
        view.once("destroy", unsubscribe);
        scene.events.once("shutdown", unsubscribe);
        return view;
      },
    });
  },
};
