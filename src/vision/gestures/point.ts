import type { Point } from "../../shared/types";

export type PointDirection = "left" | "right" | "up";

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
/** Fingertip-to-wrist over knuckle-to-wrist: straight ≈ 2, curled < 1 (see hand-pose.ts). */
const EXTENDED = 1.5;
const CURLED = 1.05;
const DOMINANCE = 1.5;

/** Index finger out, the other three curled in, and which way the finger points (or null). */
export function pointingDirection(landmarks: Point[] | null): PointDirection | null {
  if (!landmarks || landmarks.length < 21) return null;
  const ratio = (mcp: number, tip: number) => {
    const base = dist(landmarks[mcp], landmarks[0]);
    return base > 1e-6 ? dist(landmarks[tip], landmarks[0]) / base : NaN;
  };
  if (!(ratio(5, 8) > EXTENDED)) return null;
  for (const [mcp, tip] of [
    [9, 12],
    [13, 16],
    [17, 20],
  ] as const)
    if (!(ratio(mcp, tip) < CURLED)) return null;
  const dx = landmarks[8].x - landmarks[5].x;
  const dy = landmarks[8].y - landmarks[5].y;
  if (Math.abs(dx) > Math.abs(dy) * DOMINANCE) return dx < 0 ? "left" : "right";
  if (dy < 0 && Math.abs(dy) > Math.abs(dx) * DOMINANCE) return "up";
  return null;
}

/**
 * Pointing as a command: hold the same direction briefly and it fires once; the pose has to
 * be released (or the hand lost) before it can fire again. Gaps reset it, never fire it.
 */
export class PointTrigger {
  private direction: PointDirection | null = null;
  private since = 0;
  private armed = true;
  private releasedSince: number | null = null;
  private lastTime = -Infinity;

  constructor(
    private holdMs = 150,
    private releaseMs = 150,
  ) {}

  /** Call after a swipe so the hand left pointing at the end of the stroke can't double-fire. */
  disarm() {
    this.armed = false;
  }

  push(t: number, landmarks: Point[] | null): PointDirection | null {
    if (!Number.isFinite(t)) return null;
    if (t <= this.lastTime || t - this.lastTime > 220) {
      this.direction = null;
      this.releasedSince = null;
    }
    this.lastTime = t;
    const now = pointingDirection(landmarks);
    if (!now) {
      this.direction = null;
      this.releasedSince ??= t;
      if (t - this.releasedSince >= this.releaseMs) this.armed = true;
      return null;
    }
    this.releasedSince = null;
    if (now !== this.direction) {
      this.direction = now;
      this.since = t;
      return null;
    }
    if (!this.armed || t - this.since < this.holdMs) return null;
    this.armed = false;
    return now;
  }
}
