import { expect, it } from "vitest";
import type { HandFrame, VisionHandle } from "../shared/vision";
import { installMenuMotion, MenuMotion, onMenuMotion } from "./menu-motion";
function frame(t: number, player: "runner" | "saboteur" = "runner", x = 0.5, y = 0.5): HandFrame {
  return { t, player, gesture: null, landmarks: Array.from({ length: 21 }, () => ({ x, y })) };
}
it.each(["runner", "saboteur"] as const)(
  "starts for either horizontal or vertical motion from %s, exactly once",
  (player) => {
    for (const [x, y] of [
      [0.6, 0.5],
      [0.5, 0.6],
    ]) {
      const motion = new MenuMotion();
      expect(motion.push(frame(0, player))).toBe(false);
      expect(motion.push(frame(33, player, x, y))).toBe(true);
      expect(motion.push(frame(66, player, x, y))).toBe(false);
    }
  },
);
it("accepts a finger wave but ignores initial detection, jitter, a lost hand and old observations", () => {
  const motion = new MenuMotion();
  expect(motion.push(frame(0))).toBe(false);
  expect(motion.push(frame(33, "runner", 0.51))).toBe(false);
  expect(motion.push({ ...frame(66), landmarks: null })).toBe(false);
  expect(motion.push(frame(99, "runner", 0.8))).toBe(false);
  expect(motion.push(frame(1000))).toBe(false);
  const wave = frame(1033);
  wave.landmarks![8].y = 0.4;
  expect(motion.push(wave)).toBe(true);
});
it("listens only while the menu subscribes and gives each new menu a fresh baseline", () => {
  let accept: (frame: HandFrame) => void = () => {};
  const source: Pick<VisionHandle, "onFrame"> = {
    onFrame: (fn) => {
      accept = fn;
      return () => {
        accept = () => {};
      };
    },
  };
  const stop = installMenuMotion(source);
  let starts = 0;
  const off = onMenuMotion(() => starts++);
  accept(frame(0));
  accept(frame(33, "saboteur"));
  accept(frame(66, "saboteur", 0.7));
  expect(starts).toBe(1);
  off();
  accept(frame(99, "runner", 0.9));
  expect(starts).toBe(1);
  const offAgain = onMenuMotion(() => starts++);
  accept(frame(132, "runner", 0.9));
  expect(starts).toBe(1);
  accept(frame(165, "runner", 0.7));
  expect(starts).toBe(2);
  offAgain();
  stop();
});
