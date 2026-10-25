import type { Lane } from "../../shared/types";

/** Edge spills slide inward; center spills follow momentum, or choose either neighbor. */
export function spillLane(lane: Lane, velocity: number, rng = Math.random): Lane {
  if (lane === 0) return 1;
  if (lane === 2) return 1;
  if (Math.abs(velocity) > 20) return velocity < 0 ? 0 : 2;
  return rng() < 0.5 ? 0 : 2;
}
