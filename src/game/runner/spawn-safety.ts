import { GIANT_RELEASE_Y } from "../../shared/combat";
import type { ObstacleSpec } from "../../shared/world";
import type { Lane } from "../../shared/types";

/** Never create a simultaneous, unjumpable wall across all three lanes. */
export function hasEscapeLane(
  spec: ObstacleSpec,
  existing: readonly { lane: Lane; y: number; jumpable: boolean; lethal: boolean }[],
): boolean {
  if (spec.jumpable || spec.effect !== "end-run") return true;
  const blocked = new Set(
    existing
      .filter((o) => o.lethal && !o.jumpable && o.y < GIANT_RELEASE_Y + 200)
      .map((o) => o.lane),
  );
  blocked.add(spec.lane);
  return blocked.size < 3;
}
