/**
 * Holding a hand toward one side as a command ("lean"): dwell in the left or right edge zone
 * and it fires once. It only arms after the hand has rested in the middle, so the hand a swipe
 * leaves at the edge, or one that starts there, never triggers it. Returning to the middle
 * re-arms it, which is what makes "swipe, then bring the hand back" safe.
 */
export class ZoneNudge {
  private armed = false;
  private centerSince: number | null = null;
  private edge: "left" | "right" | null = null;
  private edgeSince = 0;
  private lastTime = -Infinity;

  constructor(
    private edgeFraction = 0.22,
    private dwellMs = 300,
    private centerMs = 150,
  ) {}

  disarm() {
    this.armed = false;
    this.centerSince = null;
  }

  push(t: number, x: number | null): "left" | "right" | null {
    if (!Number.isFinite(t)) return null;
    if (t <= this.lastTime || t - this.lastTime > 220) {
      this.edge = null;
      this.centerSince = null;
    }
    this.lastTime = t;
    if (x === null || !Number.isFinite(x)) {
      this.armed = false;
      this.edge = null;
      this.centerSince = null;
      return null;
    }
    const zone = x < this.edgeFraction ? "left" : x > 1 - this.edgeFraction ? "right" : null;
    if (!zone) {
      this.edge = null;
      this.centerSince ??= t;
      if (t - this.centerSince >= this.centerMs) this.armed = true;
      return null;
    }
    this.centerSince = null;
    if (zone !== this.edge) {
      this.edge = zone;
      this.edgeSince = t;
      return null;
    }
    if (!this.armed || t - this.edgeSince < this.dwellMs) return null;
    this.armed = false;
    return zone;
  }
}
