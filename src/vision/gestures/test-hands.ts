import type { Point } from "../../shared/types";

/** Wrist (0.5, 0.9); knuckles 0.2 up; index tip reaches `dir`; other fingers curled in. */
export function pointingHand(dir: "left" | "right" | "up" | null): Point[] {
  const lm: Point[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.9 }));
  const knuckle = [
    [5, -0.06],
    [9, -0.02],
    [13, 0.02],
    [17, 0.06],
  ] as const;
  for (const [mcp, dx] of knuckle) {
    lm[mcp] = { x: 0.5 + dx, y: 0.7 };
    lm[mcp + 3] = { x: 0.5 + dx, y: 0.76 }; // curled: tip close to the wrist
  }
  const base = lm[5];
  if (dir === "up") lm[8] = { x: base.x, y: base.y - 0.3 };
  if (dir === "left") lm[8] = { x: base.x - 0.3, y: base.y - 0.05 };
  if (dir === "right") lm[8] = { x: base.x + 0.3, y: base.y - 0.05 };
  return lm;
}
