import { expect, it } from "vitest";
import { SwipeDetector } from "./swipe";
const feed = (samples: readonly (readonly [number, number, number])[]) => {
  const detector = new SwipeDetector();
  return samples.flatMap(([t, x, y]) => {
    const swipe = detector.push(t, { x, y });
    return swipe ? [{ t, swipe }] : [];
  });
};
it("keeps a large fast displacement when further aligned motion corroborates it", () => {
  expect(
    feed([
      [0, 0.85, 0.5],
      [33, 0.85, 0.5],
      [66, 0.85, 0.5],
      [99, 0.2, 0.5],
      [132, 0.16, 0.5],
    ]).map((s) => s.swipe),
  ).toEqual(["left"]);
});
it("accepts three consistent observations of a 32 ms flick at 60 fps", () => {
  expect(
    feed([
      [0, 0.8, 0.5],
      [16, 0.65, 0.5],
      [32, 0.5, 0.5],
    ]),
  ).toEqual([{ t: 32, swipe: "left" }]);
});
it("accepts a jump after a dodge without waiting out an unrelated horizontal cooldown", () => {
  expect(
    feed([
      [0, 0.8, 0.7],
      [33, 0.65, 0.7],
      [66, 0.5, 0.7],
      [99, 0.5, 0.55],
      [132, 0.5, 0.4],
      [165, 0.5, 0.25],
    ]).map((s) => s.swipe),
  ).toEqual(["left", "up"]);
});
it("allows an intentional reversal after a corroborated 60-fps burst", () => {
  expect(
    feed([
      [0, 0.9, 0.5],
      [16, 0.8, 0.5],
      [32, 0.65, 0.5],
      [48, 0.5, 0.5],
      [64, 0.4, 0.5],
      [97, 0.4, 0.5],
      [130, 0.4, 0.5],
      [163, 0.5, 0.5],
      [196, 0.6, 0.5],
      [229, 0.7, 0.5],
    ]).map((s) => s.swipe),
  ).toEqual(["left", "right"]);
});
it("allows another deliberate same-direction stroke after a short rest", () => {
  expect(
    feed([
      [0, 0.85, 0.5],
      [33, 0.7, 0.5],
      [66, 0.55, 0.5],
      [99, 0.5, 0.5],
      [132, 0.5, 0.5],
      [165, 0.5, 0.5],
      [198, 0.5, 0.5],
      [231, 0.4, 0.5],
      [264, 0.3, 0.5],
      [297, 0.2, 0.5],
    ]).map((s) => s.swipe),
  ).toEqual(["left", "left"]);
});
it("still rejects a one-frame tracking spike and a slow reset", () => {
  expect(
    feed([
      [0, 0.5, 0.5],
      [33, 0.5, 0.5],
      [66, 0.99, 0.5],
      [99, 0.5, 0.5],
      [132, 0.5, 0.5],
    ]),
  ).toEqual([]);
});

it("ignores a large tracking relocation followed only by small jitter", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const points: [number, number, number][] = [];
    for (let t = 0; t <= 500; t += 33)
      points.push([t, (t < 150 ? 0.4 : 0.9) + Math.sin(t * seed) * 0.006, 0.5]);
    expect(feed(points)).toEqual([]);
  }
});
