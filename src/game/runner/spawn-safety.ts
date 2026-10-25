import { GIANT_RELEASE_Y } from "../../shared/combat";
import type { ObstacleSpec } from "../../shared/world";
import type { Lane } from "../../shared/types";
import { RUNNER } from "./config";
import { hazardSpeed } from "./active-hazards";

interface ExistingThreat {
  lane: Lane;
  y: number;
  jumpable: boolean;
  lethal: boolean;
  height?: number;
  minSpeed?: number;
  maxSpeed?: number;
}
/** Earliest possible entry to latest possible exit, with a small decision margin. */
function contactWindow(y: number, height: number, minSpeed: number, maxSpeed: number) {
  const half = (height + RUNNER.hitboxSize) / 2;
  if (y - half > RUNNER.runnerY) return null;
  return {
    start: maxSpeed <= 0 ? 0 : Math.max(0, (RUNNER.runnerY - y - half) / maxSpeed) - 0.15,
    end: minSpeed <= 0 ? Infinity : (RUNNER.runnerY - y + half) / minSpeed + 0.15,
  };
}
/** Never schedule three solid lethal lanes together, even when a projectile catches a slower wave. */
export function hasEscapeLane(
  spec: ObstacleSpec,
  existing: readonly ExistingThreat[],
  motion?: { speed: number; timeScale: number },
): boolean {
  if (spec.jumpable || spec.effect !== "end-run") return true;
  const blocked = new Set<Lane>();
  if (motion) {
    // Using the giant's release point is conservative for natural hazards that start above it.
    const candidate = contactWindow(
      GIANT_RELEASE_Y,
      spec.height ?? 40,
      hazardSpeed(spec.kind, 0, motion.speed, motion.timeScale),
      hazardSpeed(spec.kind, 10000, motion.speed, motion.timeScale),
    )!;
    for (const threat of existing) {
      if (!threat.lethal || threat.jumpable) continue;
      const window = contactWindow(
        threat.y,
        threat.height ?? 40,
        threat.minSpeed ?? motion.speed,
        threat.maxSpeed ?? motion.speed,
      );
      if (window && window.start <= candidate.end && candidate.start <= window.end)
        blocked.add(threat.lane);
    }
  } else {
    // Compatibility for callers with only geometric observations.
    existing
      .filter((o) => o.lethal && !o.jumpable && o.y < GIANT_RELEASE_Y + 200)
      .forEach((o) => blocked.add(o.lane));
  }
  blocked.add(spec.lane);
  return blocked.size < 3;
}
