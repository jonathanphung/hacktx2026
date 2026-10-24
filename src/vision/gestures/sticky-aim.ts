/**
 * After a relative aim step (swipe/point), the absolute palm position would immediately drag
 * the target back to the lane under the hand. This holds position-aiming off until the hand
 * has come to rest and then moved a deliberate distance from where it rested.
 */
export class StickyAim {
  private active = false;
  private anchor: number | null = null;
  private last: { t: number; x: number } | null = null;
  private stillSince: number | null = null;

  constructor(
    private moveFraction = 0.1,
    private stillMs = 200,
    private stillSpeed = 0.25,
  ) {}

  /** True while position aiming should be ignored. Feed it every frame with the palm x. */
  push(t: number, x: number | null): boolean {
    if (!this.active) return false;
    if (x === null) {
      this.reset();
      return false;
    }
    if (this.last && t > this.last.t) {
      const speed = Math.abs(x - this.last.x) / ((t - this.last.t) / 1000);
      if (speed < this.stillSpeed) this.stillSince ??= t;
      else this.stillSince = null;
    }
    this.last = { t, x };
    if (this.anchor === null) {
      if (this.stillSince !== null && t - this.stillSince >= this.stillMs) this.anchor = x;
    } else if (Math.abs(x - this.anchor) > this.moveFraction) {
      this.reset();
      return false;
    }
    return true;
  }

  engage() {
    this.active = true;
    this.anchor = null;
    this.last = null;
    this.stillSince = null;
  }

  private reset() {
    this.active = false;
    this.anchor = null;
    this.last = null;
    this.stillSince = null;
  }
}
