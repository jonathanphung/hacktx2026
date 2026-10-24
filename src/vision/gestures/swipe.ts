import type { Point } from "../../shared/types";

export type Swipe = "left" | "right" | "up" | "down";
export interface SwipeOptions {
  windowMs: number;
  minDistance: number;
  cooldownMs: number;
}
export const DEFAULT_SWIPE: SwipeOptions = { windowMs: 250, minDistance: 0.2, cooldownMs: 350 };

/** Timestamped, normalized positions; no dependency on camera resolution or frame rate. */
export class SwipeDetector {
  private samples: { t: number; p: Point }[] = [];
  private lastFire = -Infinity;
  private lastTime = -Infinity;

  constructor(private opts: SwipeOptions = DEFAULT_SWIPE) {}

  push(t: number, p: Point | null): Swipe | null {
    if (!Number.isFinite(t)) return null;
    if (t <= this.lastTime || t - this.lastTime > 180) this.samples = [];
    this.lastTime = t;
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      this.samples = [];
      return null;
    }
    // Keep refreshing the baseline during cooldown, never buffer a return stroke.
    if (t - this.lastFire < this.opts.cooldownMs) {
      this.samples = [{ t, p }];
      return null;
    }
    this.samples.push({ t, p });
    while (this.samples.length && t - this.samples[0].t > this.opts.windowMs) this.samples.shift();
    const first = this.samples[0];
    if (t - first.t < 60 || this.samples.length < 3) return null;
    const dx = p.x - first.p.x;
    const dy = p.y - first.p.y;
    const distance = Math.hypot(dx, dy);
    let path = 0;
    for (let i = 1; i < this.samples.length; i++) {
      const a = this.samples[i - 1].p;
      const b = this.samples[i].p;
      path += Math.hypot(b.x - a.x, b.y - a.y);
    }
    // Reject loops/zigzags and ambiguous diagonals rather than guessing a lane change.
    if (!path || distance / path < 0.8) return null;
    let swipe: Swipe | null = null;
    if (Math.abs(dx) >= this.opts.minDistance && Math.abs(dx) > Math.abs(dy) * 1.5)
      swipe = dx < 0 ? "left" : "right";
    else if (Math.abs(dy) >= this.opts.minDistance && Math.abs(dy) > Math.abs(dx) * 1.5)
      swipe = dy < 0 ? "up" : "down";
    if (swipe) {
      this.lastFire = t;
      this.samples = [{ t, p }];
    }
    return swipe;
  }
}
