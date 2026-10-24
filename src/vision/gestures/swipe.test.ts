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

it("recognizes down for the lab", () => {
  expect(run(new SwipeDetector(), [0.5, 0.3], [0.5, 0.7], 200)).toEqual(["down"]);
});
it("rejects diagonal ambiguity", () => {
  expect(run(new SwipeDetector(), [0.2, 0.2], [0.7, 0.7], 200)).toEqual([]);
});
it("does not interpret tracking reacquisition as a swipe", () => {
  const detector = new SwipeDetector();
  detector.push(0, { x: 0.1, y: 0.5 });
  expect(detector.push(600, { x: 0.9, y: 0.5 })).toBeNull();
  expect(detector.push(633, { x: 0.9, y: 0.5 })).toBeNull();
});
it.each([15, 30, 60])("recognizes a deliberate swipe at %i fps", (fps) => {
  const detector = new SwipeDetector();
  const events = [];
  for (let t = 0; t <= 250; t += 1000 / fps) {
    const result = detector.push(t, { x: 0.2 + t / 500, y: 0.5 });
    if (result) events.push(result);
  }
  expect(events).toEqual(["right"]);
});

it("recognizes a swipe that starts after a rest, with jitter and a slightly diagonal path", () => {
  const detector = new SwipeDetector();
  const events: { swipe: string; t: number }[] = [];
  for (let t = 0; t <= 800; t += 33) {
    const k = Math.min(1, Math.max(0, (t - 400) / 230));
    const jitter = Math.sin(t) * 0.006;
    // Up stroke drifting sideways ~25 degrees off vertical, like a real hand.
    const result = detector.push(t, { x: 0.5 + k * 0.1 + jitter, y: 0.75 - k * 0.3 + jitter });
    if (result) events.push({ swipe: result, t });
  }
  expect(events.map((e) => e.swipe)).toEqual(["up"]);
  // Fires partway through the stroke instead of waiting for it to finish.
  expect(events[0].t).toBeLessThan(400 + 230);
});
it("recognizes a slow deliberate swipe spread over most of the window", () => {
  expect(run(new SwipeDetector(), [0.3, 0.5], [0.65, 0.5], 320)).toEqual(["right"]);
});
it("still ignores the return stroke after a swipe", () => {
  const detector = new SwipeDetector();
  const out = [
    ...run(detector, [0.7, 0.5], [0.3, 0.5], 200),
    ...run(detector, [0.3, 0.5], [0.7, 0.5], 250, 233),
  ];
  expect(out).toEqual(["left"]);
});
