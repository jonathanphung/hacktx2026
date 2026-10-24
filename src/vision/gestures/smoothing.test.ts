import { expect, it } from "vitest";
import { PalmFilter } from "./smoothing";
import { LaneAim } from "./aim";
import { SwipeDetector } from "./swipe";

it.each([15, 30, 60])("filters small idle jitter without swipes at %i fps", (fps) => {
  const filter = new PalmFilter();
  const swipe = new SwipeDetector();
  for (let i = 0; i < 200; i++) {
    const t = (i * 1000) / fps;
    const p = filter.push(t, { x: 0.5 + Math.sin(i) * 0.015, y: 0.5 + Math.cos(i) * 0.015 });
    expect(swipe.push(t, p)).toBeNull();
  }
});
it("resets smoothing immediately when a hand disappears", () => {
  const filter = new PalmFilter();
  filter.push(0, { x: 0.1, y: 0.5 });
  filter.push(30, null);
  expect(filter.push(60, { x: 0.9, y: 0.5 })).toEqual({ x: 0.9, y: 0.5 });
});
it("ignores invalid aim rather than poisoning lane state", () => {
  const aim = new LaneAim();
  expect(aim.push(NaN)).toBeNull();
  expect(aim.push(Infinity)).toBeNull();
  expect(aim.push(0.1)).toBe(0);
});
