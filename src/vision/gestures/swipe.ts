import type { Point } from "../../shared/types";

export type Swipe = "left" | "right" | "up";

export interface SwipeOptions {
  /** How far back to look for the motion. */
  windowMs: number;
  /** Minimum travel, as a fraction of the player's half of the frame. */
  minDistance: number;
  /** Ignore new swipes for this long after one fires (stops one motion counting twice). */
  cooldownMs: number;
}

export const DEFAULT_SWIPE: SwipeOptions = { windowMs: 250, minDistance: 0.2, cooldownMs: 350 };

/**
 * Detects quick hand motions from a stream of positions (on-screen, mirrored coordinates).
 * Pure logic, no camera: feed it recorded samples in tests.
 */
export class SwipeDetector {
  private samples: { t: number; p: Point }[] = [];
  private lastFire = -Infinity;

  constructor(private opts: SwipeOptions = DEFAULT_SWIPE) {}

  /** Push the latest hand position (null = no hand). Returns a swipe when one completes. */
  push(t: number, p: Point | null): Swipe | null {
    if (!p) {
      this.samples = [];
      return null;
    }
    this.samples.push({ t, p });
    while (this.samples.length && t - this.samples[0].t > this.opts.windowMs) this.samples.shift();
    if (t - this.lastFire < this.opts.cooldownMs) return null;

    const dx = p.x - this.samples[0].p.x;
    const dy = p.y - this.samples[0].p.y;
    let swipe: Swipe | null = null;
    if (Math.abs(dx) >= this.opts.minDistance && Math.abs(dx) > Math.abs(dy)) {
      swipe = dx < 0 ? "left" : "right";
    } else if (-dy >= this.opts.minDistance && -dy > Math.abs(dx)) {
      swipe = "up"; // image y grows downward
    }
    if (swipe) {
      this.lastFire = t;
      this.samples = [];
    }
    return swipe;
  }
}
