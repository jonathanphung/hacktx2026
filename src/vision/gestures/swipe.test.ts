import { describe, expect, it } from "vitest";
import { SwipeDetector } from "./swipe";

/** Feeds a straight-line motion at 30 fps and returns every swipe it produced. */
function run(det: SwipeDetector, from: [number, number], to: [number, number], ms: number, t0 = 0) {
  const out = [];
  const frames = Math.round(ms / 33);
  for (let i = 0; i <= frames; i++) {
    const k = i / frames;
    const s = det.push(t0 + i * 33, {
      x: from[0] + (to[0] - from[0]) * k,
      y: from[1] + (to[1] - from[1]) * k,
    });
    if (s) out.push(s);
  }
  return out;
}

describe("SwipeDetector", () => {
  it("detects a fast left, right and up swipe", () => {
    expect(run(new SwipeDetector(), [0.7, 0.5], [0.3, 0.5], 200)).toEqual(["left"]);
    expect(run(new SwipeDetector(), [0.3, 0.5], [0.7, 0.5], 200)).toEqual(["right"]);
    expect(run(new SwipeDetector(), [0.5, 0.8], [0.5, 0.4], 200)).toEqual(["up"]);
  });

  it("ignores slow drifting", () => {
    expect(run(new SwipeDetector(), [0.3, 0.5], [0.7, 0.5], 2000)).toEqual([]);
  });

  it("fires once per motion, not repeatedly", () => {
    expect(run(new SwipeDetector(), [0.9, 0.5], [0.1, 0.5], 250)).toEqual(["left"]);
  });

  it("resets when the hand disappears", () => {
    const det = new SwipeDetector();
    det.push(0, { x: 0.7, y: 0.5 });
    det.push(33, null);
    expect(det.push(66, { x: 0.3, y: 0.5 })).toBeNull();
  });
});
