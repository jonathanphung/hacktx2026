import type { Point } from "../../shared/types";

/** Time-based low-pass filter: same feel at 15/30/60 fps, reset across tracking gaps. */
export class PalmFilter {
  private point: Point | null = null;
  private time = -Infinity;

  push(t: number, p: Point | null): Point | null {
    if (!p || !Number.isFinite(t) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      this.point = null;
      return null;
    }
    const dt = t - this.time;
    const alpha = this.point && dt > 0 && dt < 180 ? 1 - Math.exp(-dt / 30) : 1;
    this.point = {
      x: (this.point?.x ?? p.x) + alpha * (p.x - (this.point?.x ?? p.x)),
      y: (this.point?.y ?? p.y) + alpha * (p.y - (this.point?.y ?? p.y)),
    };
    this.time = t;
    return this.point;
  }
}
