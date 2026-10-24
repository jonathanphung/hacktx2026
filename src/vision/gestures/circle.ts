import type { Point } from "../../shared/types";

/** Lab-only spell gesture. Does not introduce new game actions into the shared contract. */
export class CircleDetector {
  private samples: { t: number; p: Point }[] = [];
  private last = -Infinity;
  private cooldown = -Infinity;

  push(t: number, p: Point | null): "clockwise" | "counterclockwise" | null {
    if (!Number.isFinite(t)) return null;
    if (t <= this.last || t - this.last > 180 || !p) this.samples = [];
    this.last = t;
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || t < this.cooldown) return null;
    this.samples.push({ t, p });
    while (this.samples.length && t - this.samples[0].t > 1600) this.samples.shift();
    if (this.samples.length < 12 || t - this.samples[0].t < 400) return null;
    // Try suffixes so an idle hold or previous gesture cannot hide a new circle.
    for (let start = 0; start <= this.samples.length - 12; start++) {
      if (t - this.samples[start].t < 400) break;
      const points = this.samples.slice(start).map((s) => s.p);
      const xs = points.map((q) => q.x);
      const ys = points.map((q) => q.y);
      const width = Math.max(...xs) - Math.min(...xs);
      const height = Math.max(...ys) - Math.min(...ys);
      if (Math.min(width, height) < 0.18 || Math.max(width, height) / Math.min(width, height) > 2.5)
        continue;
      const center = {
        x: (Math.max(...xs) + Math.min(...xs)) / 2,
        y: (Math.max(...ys) + Math.min(...ys)) / 2,
      };
      let turn = 0;
      let travel = 0;
      let discontinuous = false;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (Math.hypot(b.x - a.x, b.y - a.y) > Math.min(width, height) * 0.45) discontinuous = true;
        const delta =
          Math.atan2(b.y - center.y, b.x - center.x) - Math.atan2(a.y - center.y, a.x - center.x);
        const wrapped = Math.atan2(Math.sin(delta), Math.cos(delta));
        turn += wrapped;
        travel += Math.abs(wrapped);
      }
      const first = points[0];
      const closure = Math.hypot(p.x - first.x, p.y - first.y);
      if (
        discontinuous ||
        Math.abs(turn) < Math.PI * 1.8 ||
        travel > Math.abs(turn) * 1.2 ||
        closure > Math.min(width, height) * 0.3
      )
        continue;
      this.samples = [];
      this.cooldown = t + 500;
      return turn > 0 ? "clockwise" : "counterclockwise";
    }
    return null;
  }
}
