import { afterEach, expect, it, vi } from "vitest";
import type { HandFrame } from "../shared/vision";
import { StoryPalmHold, onStoryAdvance } from "./story-controls";
import { installMenuMotion } from "./menu-motion";
function palm(t: number, player: "runner" | "saboteur" = "runner", scale = 1): HandFrame {
  const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.8 }));
  for (const base of [5, 9, 13, 17]) {
    points[base] = { x: 0.5, y: 0.8 - 0.12 * scale };
    points[base + 3] = { x: 0.5, y: 0.8 - 0.25 * scale };
  }
  return { player, t, landmarks: points, gesture: null };
}
afterEach(() => vi.useRealTimers());
it.each([0.5, 1, 1.6])("casts once after a continuous open-palm hold at hand scale %s", (scale) => {
  const hold = new StoryPalmHold();
  for (let t = 0; t < 1000; t += 100)
    expect(hold.push(palm(t, "runner", scale)).complete).toBe(false);
  expect(hold.push(palm(1000, "runner", scale))).toEqual({ progress: 1, complete: true });
  expect(hold.push(palm(1100, "runner", scale)).complete).toBe(false);
});
it("accepts the giant's recognized open palm and resets for fist, loss and long gaps", () => {
  const hold = new StoryPalmHold(300);
  expect(hold.push(palm(0, "saboteur")).progress).toBe(0);
  expect(hold.push(palm(100, "saboteur")).progress).toBeGreaterThan(0);
  expect(hold.push({ ...palm(200, "saboteur"), gesture: "Closed_Fist" }).progress).toBe(0);
  hold.push(palm(300, "saboteur"));
  expect(hold.push({ ...palm(400, "saboteur"), landmarks: null }).progress).toBe(0);
  hold.push(palm(500, "saboteur"));
  expect(hold.push(palm(900, "saboteur")).progress).toBe(0);
});
it("does not add two players' partial holds together", () => {
  const hold = new StoryPalmHold(400);
  hold.push(palm(0));
  hold.push(palm(100));
  hold.push(palm(110, "saboteur"));
  hold.push(palm(210, "saboteur"));
  expect(hold.push(palm(310, "saboteur")).complete).toBe(false);
  expect(hold.push(palm(410, "saboteur")).complete).toBe(false);
  expect(hold.push(palm(510, "saboteur")).complete).toBe(true);
});
it("arms wave-to-continue after a grace period and removes the listener on cleanup", () => {
  vi.useFakeTimers();
  let frame: (f: HandFrame) => void = () => {};
  const stop = installMenuMotion({
    onFrame: (fn) => {
      frame = fn;
      return () => {};
    },
  });
  const next = vi.fn();
  const off = onStoryAdvance(next);
  const wave = (t: number) => {
    frame(palm(t));
    const f = palm(t + 33);
    f.landmarks![0].x += 0.2;
    frame(f);
  };
  wave(0);
  expect(next).not.toHaveBeenCalled();
  vi.advanceTimersByTime(900);
  wave(1000);
  expect(next).toHaveBeenCalledOnce();
  wave(1100);
  expect(next).toHaveBeenCalledOnce();
  off();
  vi.advanceTimersByTime(2000);
  wave(4000);
  expect(next).toHaveBeenCalledOnce();
  stop();
});
