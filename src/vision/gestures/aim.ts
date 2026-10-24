import type { Lane } from "../../shared/types";

/**
 * Maps horizontal hand position (0..1 across the player's half) to a lane, with hysteresis
 * so a hand resting near a boundary doesn't flicker between lanes.
 */
export class LaneAim {
  private lane: Lane = 1;

  constructor(private margin = 0.05) {}

  /** Returns the new lane when it changes, otherwise null. */
  push(x: number | null): Lane | null {
    if (x === null || !Number.isFinite(x)) return null;
    const lo = this.lane / 3 - (this.lane > 0 ? this.margin : 0);
    const hi = (this.lane + 1) / 3 + (this.lane < 2 ? this.margin : 0);
    if (x >= lo && x <= hi) return null;
    this.lane = Math.min(2, Math.max(0, Math.floor(x * 3))) as Lane;
    return this.lane;
  }
}
