import type { Lane } from "../../shared/types";

/**
 * Freezes the aimed lane while the saboteur closes their fist. The palm landmark drifts as the
 * fingers curl, so the lane seen when the fist is first recognized can be wrong. The lock rewinds
 * to the lane that was stable `lookbackMs` earlier and holds it until the hand opens again.
 */
export class TargetLock {
  private history: { t: number; lane: Lane }[] = [];
  private lockedLane: Lane | null = null;
  private lastTime = -Infinity;

  constructor(private lookbackMs = 200) {}

  get locked() {
    return this.lockedLane !== null;
  }

  /** Returns the lane to lock onto on the frame the fist is first seen, otherwise null. */
  push(t: number, gesture: string | null, hasHand: boolean, lane: Lane): Lane | null {
    if (!Number.isFinite(t)) return null;
    if (t <= this.lastTime || t - this.lastTime > 180) this.history = [];
    this.lastTime = t;
    if (!hasHand) {
      // A lost hand ends the lock; aiming restarts from wherever the hand reappears.
      this.lockedLane = null;
      this.history = [];
      return null;
    }
    if (this.lockedLane !== null) {
      if (gesture === "Open_Palm") this.lockedLane = null;
      else return null;
    }
    this.history.push({ t, lane });
    while (this.history.length > 1 && t - this.history[1].t >= this.lookbackMs * 2)
      this.history.shift();
    if (gesture !== "Closed_Fist") return null;
    let stable = this.history[0].lane;
    for (const sample of this.history) if (sample.t <= t - this.lookbackMs) stable = sample.lane;
    this.lockedLane = stable;
    return stable;
  }
}
