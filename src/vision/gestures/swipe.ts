import type { Point } from "../../shared/types";

export type Swipe = "left" | "right" | "up" | "down";
export interface SwipeOptions {
  windowMs: number;
  minDistance: number;
  cooldownMs: number;
}
const MIN_STROKE_MS = 50;
/** A longer tracking gap than this is a reacquisition, not motion. */
const MAX_GAP_MS = 220;
const MIN_STRAIGHTNESS = 0.75;
/** How much one axis must dominate the other (1.35 ≈ within 36° of horizontal/vertical). */
const DOMINANCE = 1.35;
export const DEFAULT_SWIPE: SwipeOptions = { windowMs: 300, minDistance: 0.2, cooldownMs: 350 };

/** Timestamped, normalized positions; no dependency on camera resolution or frame rate. */
export class SwipeDetector {
  private samples: { t: number; p: Point }[] = [];
  private lastFire = -Infinity;
  private lastTime = -Infinity;

  constructor(private opts: SwipeOptions = DEFAULT_SWIPE) {}

  push(t: number, p: Point | null): Swipe | null {
    if (!Number.isFinite(t)) return null;
    if (t <= this.lastTime || t - this.lastTime > MAX_GAP_MS) this.samples = [];
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
    // Test every start point, shortest window first: a swipe that begins after a rest, or
    // that decelerates, is recognized as soon as ANY recent stretch of the motion qualifies.
    // Anchoring on the oldest sample only made slow or wobbly strokes fail unpredictably.
    let swipe: Swipe | null = null;
    let path = 0;
    for (let i = this.samples.length - 2; i >= 0 && !swipe; i--) {
      const a = this.samples[i].p;
      const b = this.samples[i + 1].p;
      path += Math.hypot(b.x - a.x, b.y - a.y);
      const first = this.samples[i];
      if (t - first.t < MIN_STROKE_MS || this.samples.length - i < 3) continue;
      const dx = p.x - first.p.x;
      const dy = p.y - first.p.y;
      // Reject loops/zigzags and ambiguous diagonals rather than guessing a lane change.
      if (!path || Math.hypot(dx, dy) / path < MIN_STRAIGHTNESS) continue;
      if (Math.abs(dx) >= this.opts.minDistance && Math.abs(dx) > Math.abs(dy) * DOMINANCE)
        swipe = dx < 0 ? "left" : "right";
      else if (Math.abs(dy) >= this.opts.minDistance && Math.abs(dy) > Math.abs(dx) * DOMINANCE)
        swipe = dy < 0 ? "up" : "down";
    }
    if (swipe) {
      this.lastFire = t;
      this.samples = [{ t, p }];
    }
    return swipe;
  }
}
