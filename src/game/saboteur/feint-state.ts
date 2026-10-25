export const FEINT_COOLDOWN_MS = 8000;
export const FEINT_WINDUP_MS = 650;
/** Uses the same pause-adjusted update clock as real casts. */
export class FeintState {
  private readyAt = 0;
  private endsAt: number | null = null;
  remaining(now: number) {
    return Math.max(0, this.readyAt - now);
  }
  start(now: number): boolean {
    if (!Number.isFinite(now) || now < 0 || this.remaining(now) > 0) return false;
    this.readyAt = now + FEINT_COOLDOWN_MS;
    this.endsAt = now + FEINT_WINDUP_MS;
    return true;
  }
  finish(now: number): boolean {
    if (this.endsAt === null || now < this.endsAt) return false;
    this.endsAt = null;
    return true;
  }
}
