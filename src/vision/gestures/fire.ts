/** Debounced pose edge. Missing/uncertain classifications NEVER re-arm an action. */
export class PoseTrigger {
  private since: number | null = null;
  private releaseSince: number | null = null;
  private armed = true;
  private lastTime = -Infinity;
  private lastPose = -Infinity;
  private lastOpen = -Infinity;

  constructor(
    private pose: string,
    private holdMs = 100,
    private releaseMs = 120,
    private uncertaintyMs = 0,
  ) {}

  push(t: number, gesture: string | null): boolean {
    if (!Number.isFinite(t)) return false;
    if (t <= this.lastTime || t - this.lastTime > 180) {
      this.since = null;
      this.releaseSince = null;
    }
    this.lastTime = t;
    // Uncertain frames cannot fire or re-arm. Preserve only a short pending hold.
    if (this.uncertaintyMs > 0 && (gesture === null || gesture === "None")) {
      if (t - this.lastPose > this.uncertaintyMs) this.since = null;
      if (t - this.lastOpen > this.uncertaintyMs) this.releaseSince = null;
      return false;
    }
    if (gesture === "Open_Palm") {
      this.lastOpen = t;
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
    this.lastPose = t;
    this.since ??= t;
    if (!this.armed || t - this.since < this.holdMs) return false;
    this.armed = false;
    return true;
  }
}

export class FistTrigger extends PoseTrigger {
  constructor() {
    super("Closed_Fist", 100, 120, 80);
  }
}
