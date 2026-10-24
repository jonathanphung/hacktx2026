import { expect, it } from "vitest";
import { CircleDetector } from "./circle";

it.each([1, -1])("recognizes a complete circle with direction %i", (direction) => {
  const detector = new CircleDetector();
  const results = [];
  for (let i = 0; i <= 36; i++) {
    const angle = (direction * i * Math.PI) / 18;
    const result = detector.push(i * 30, {
      x: 0.5 + Math.cos(angle) * 0.2,
      y: 0.5 + Math.sin(angle) * 0.2,
    });
    if (result) results.push(result);
  }
  expect(results).toEqual([direction === 1 ? "clockwise" : "counterclockwise"]);
});
it("rejects a straight swipe and incomplete arc", () => {
  const line = new CircleDetector();
  const arc = new CircleDetector();
  for (let i = 0; i <= 30; i++) {
    expect(line.push(i * 30, { x: i / 30, y: 0.5 })).toBeNull();
    expect(
      arc.push(i * 30, {
        x: 0.5 + Math.cos((i * Math.PI) / 30) * 0.2,
        y: 0.5 + Math.sin((i * Math.PI) / 30) * 0.2,
      }),
    ).toBeNull();
  }
});

it("finds a circle after idle samples instead of requiring a fresh detector", () => {
  const detector = new CircleDetector();
  for (let t = 0; t < 600; t += 30) detector.push(t, { x: 0.3, y: 0.5 });
  const results = [];
  for (let i = 0; i <= 36; i++) {
    const angle = (i * Math.PI) / 18;
    const result = detector.push(600 + i * 30, {
      x: 0.5 + Math.cos(angle) * 0.2,
      y: 0.5 + Math.sin(angle) * 0.2,
    });
    if (result) results.push(result);
  }
  expect(results).toEqual(["clockwise"]);
});
