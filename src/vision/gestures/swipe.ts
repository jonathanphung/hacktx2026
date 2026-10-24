import type { Point } from "../../shared/types";

export type Swipe = "left" | "right" | "up" | "down";
export interface SwipeOptions {
  windowMs: number;
  minDistance: number;
  cooldownMs: number;
  /** Mean speed (units/s) a stroke needs; slower motion is the hand drifting, not a swipe. */
  minSpeed?: number;
  /** After a swipe, the opposite direction is probably the hand coming back. */
  reverseWindowMs?: number;
  /** ...so a reversal must be at least this fraction of the previous stroke's speed... */
  reverseSpeedRatio?: number;
  /** ...and at least this fast (units/s) in absolute terms. */
  reverseMinSpeed?: number;
}
const MIN_STROKE_MS = 50;
/** A longer tracking gap than this is a reacquisition, not motion. */
const MAX_GAP_MS = 220;
const MIN_STRAIGHTNESS = 0.75;
/** How much one axis must dominate the other (1.35 ≈ within 36° of horizontal/vertical). */
const DOMINANCE = 1.35;
/** One frame jumping this far is the tracker losing and re-finding the hand, not a hand. */
const MAX_STEP = 0.35;
const OPPOSITE: Record<Swipe, Swipe> = { left: "right", right: "left", up: "down", down: "up" };
export const DEFAULT_SWIPE: SwipeOptions = {
  windowMs: 300,
  minDistance: 0.2,
  cooldownMs: 350,
  reverseWindowMs: 900,
  minSpeed: 1,
  reverseSpeedRatio: 1,
  reverseMinSpeed: 1.6,
};

/** Timestamped, normalized positions; no dependency on camera resolution or frame rate. */
export class SwipeDetector {
  private samples: { t: number; p: Point }[] = [];
  private lastFire = -Infinity;
  private lastSwipe: Swipe | null = null;
  private lastSpeed = 0;
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
    const cooling = t - this.lastFire < this.opts.cooldownMs;
    const previous = this.samples[this.samples.length - 1];
    if (previous && Math.hypot(p.x - previous.p.x, p.y - previous.p.y) > MAX_STEP)
      this.samples = [];
    this.samples.push({ t, p });
    while (this.samples.length && t - this.samples[0].t > this.opts.windowMs) this.samples.shift();
    // Test every start point, shortest window first: a swipe that begins after a rest, or
    // that decelerates, is recognized as soon as ANY recent stretch of the motion qualifies.
    // Anchoring on the oldest sample only made slow or wobbly strokes fail unpredictably.
    let swipe: Swipe | null = null;
    let swipeSpeed = 0;
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
      const speed = Math.hypot(dx, dy) / ((t - first.t) / 1000);
      // Scales with the sensitivity setting: a smaller required stroke is also a slower one.
      if (speed < (this.opts.minSpeed ?? 0) * (this.opts.minDistance / 0.2)) continue;
      let candidate: Swipe | null = null;
      if (Math.abs(dx) >= this.opts.minDistance && Math.abs(dx) > Math.abs(dy) * DOMINANCE)
        candidate = dx < 0 ? "left" : "right";
      else if (Math.abs(dy) >= this.opts.minDistance && Math.abs(dy) > Math.abs(dx) * DOMINANCE)
        candidate = dy < 0 ? "up" : "down";
      // During the cooldown only a fast reversal may fire; a repeat in the same direction waits.
      if (candidate && cooling && candidate !== OPPOSITE[this.lastSwipe ?? candidate])
        candidate = null;
      if (candidate && this.looksLikeReturn(candidate, t, speed)) candidate = null;
      swipe = candidate;
      if (candidate) swipeSpeed = speed;
    }
    if (swipe) {
      this.lastSwipe = swipe;
      this.lastSpeed = swipeSpeed;
      this.lastFire = t;
      this.samples = [{ t, p }];
    }
    return swipe;
  }

  /** The hand drifting back after a swipe is slower than a deliberate reversal flick. */
  private looksLikeReturn(candidate: Swipe, t: number, speed: number) {
    const window = this.opts.reverseWindowMs;
    if (!window || this.lastSwipe === null) return false;
    if (candidate !== OPPOSITE[this.lastSwipe] || t - this.lastFire > window) return false;
    const needed = Math.max(
      this.opts.reverseMinSpeed ?? 0,
      (this.opts.reverseSpeedRatio ?? 0) * this.lastSpeed,
    );
    return speed < needed;
  }
}
