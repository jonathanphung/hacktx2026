/** Debounced pose edge. Missing/uncertain classifications NEVER re-arm an action. */
export class PoseTrigger {
  private since: number | null = null;
  private releaseSince: number | null = null;
  private armed = true;
  private lastTime = -Infinity;

  constructor(
    private pose: string,
    private holdMs = 100,
    private releaseMs = 120,
  ) {}

  push(t: number, gesture: string | null): boolean {
    if (!Number.isFinite(t)) return false;
    if (t <= this.lastTime || t - this.lastTime > 180) {
      this.since = null;
      this.releaseSince = null;
    }
    this.lastTime = t;
    if (gesture === "Open_Palm") {
      this.since = null;
      this.releaseSince ??= t;
      if (t - this.releaseSince >= this.releaseMs) this.armed = true;
      return false;
    }
    this.releaseSince = null;
    if (gesture !== this.pose) {
      this.since = null;
      return false;
    }
    this.since ??= t;
    if (!this.armed || t - this.since < this.holdMs) return false;
    this.armed = false;
    return true;
  }
}

export class FistTrigger extends PoseTrigger {
  constructor() {
    super("Closed_Fist");
  }
}
