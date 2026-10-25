/** Modest permanent bonuses for this run; a new run always starts from zero. */
export class RelicPowers {
  count = 0;
  private wardAt = Infinity;
  collect(now: number): void {
    this.count = Math.min(6, this.count + 1);
    if (this.count === 4) this.wardAt = now;
  }
  get jumpFactor() {
    return this.count >= 1 ? 1.1 : 1;
  }
  get reach() {
    return this.count >= 2 ? 18 : 0;
  }
  get slowFactor() {
    return this.count >= 3 ? 0.75 : 1;
  }
  get scoreFactor() {
    return this.count >= 5 ? 1.15 : 1;
  }
  wardReady(now: number) {
    return now >= this.wardAt;
  }
  absorb(now: number): boolean {
    if (!this.wardReady(now)) return false;
    this.wardAt = now + 22_000;
    return true;
  }
}
