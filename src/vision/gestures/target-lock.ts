import type { Lane } from "../../shared/types";

/**
 * Freezes the aimed lane while the saboteur closes their fist. The palm landmark drifts as the
 * fingers curl, so the lane seen when the fist is first recognized can be wrong. The lock rewinds
 * to the lane that was stable `lookbackMs` earlier. It releases for a recognized non-fist
 * pose, or after 120 ms of uncertainty, so a false fist cannot latch aiming indefinitely.
 */
export class TargetLock {
  private history: { t: number; lane: Lane }[] = [];
  private lockedLane: Lane | null = null;
  private lastTime = -Infinity;
  private uncertainSince: number | null = null;

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
      this.uncertainSince = null;
      this.history = [];
      return null;
    }
    if (this.lockedLane !== null) {
      if (gesture === "Closed_Fist") {
        this.uncertainSince = null;
        return null;
      }
      const knownRelease = gesture !== null && gesture !== "None";
      this.uncertainSince ??= t;
      if (knownRelease || t - this.uncertainSince >= 120) {
        this.lockedLane = null;
        this.uncertainSince = null;
        this.history = [];
      } else return null;
    }
    this.history.push({ t, lane });
    while (this.history.length > 1 && t - this.history[1].t >= this.lookbackMs * 2)
      this.history.shift();
    if (gesture !== "Closed_Fist") return null;
    let stable = this.history[0].lane;
    for (const sample of this.history) if (sample.t <= t - this.lookbackMs) stable = sample.lane;
    this.uncertainSince = null;
    this.lockedLane = stable;
    return stable;
  }
}
