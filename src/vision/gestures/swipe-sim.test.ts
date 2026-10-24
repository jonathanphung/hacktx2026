import { describe, expect, it } from "vitest";
import { DEFAULT_SWIPE, SwipeDetector } from "./swipe";
import { evaluate, evaluateReversal, rng } from "./swipe-sim";

/**
 * Simulated people: a rest, a stroke (110–300 ms, 0.22–0.5 of the frame, slightly off-axis), a
 * hold, then the hand drifting back. Frame timing and tracking jitter vary per trial. These
 * guard the behavior players actually reported: swipes that miss, and the hand's return
 * stroke being read as a second swipe in the opposite direction.
 */
describe("swipe detection against simulated human gestures", () => {
  const result = evaluate(900);
  it("detects essentially every intended swipe, fast", () => {
    expect(result.detectionRate).toBeGreaterThanOrEqual(0.98);
    expect(result.medianLatencyMs).toBeLessThan(140);
    expect(result.p90LatencyMs).toBeLessThan(200);
  });
  it("rarely reads the hand coming back as another swipe", () => {
    // Without return filtering this was ~0.9 extra opposite swipes per gesture.
    expect(result.ghostsPerTrial).toBeLessThan(0.25);
  });
  it("still lets a deliberate flick-and-flick-back register both strokes", () => {
    expect(evaluateReversal(300).reversalRate).toBeGreaterThan(0.6);
  });
});

it("never fires on a resting hand's jitter or slow wandering", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const r = rng(seed);
    const detector = new SwipeDetector(DEFAULT_SWIPE);
    let x = 0.5;
    let y = 0.5;
    let fired = 0;
    for (let t = 0; t < 10_000; t += 33) {
      x += (r() - 0.5) * 0.01 + Math.sin(t / 1500) * 0.0015;
      y += (r() - 0.5) * 0.01 + Math.cos(t / 1700) * 0.0015;
      x = Math.min(0.9, Math.max(0.1, x));
      y = Math.min(0.9, Math.max(0.1, y));
      if (detector.push(t, { x, y })) fired++;
    }
    expect(fired).toBe(0);
  }
});

it("ignores a single-frame tracking jump instead of reading it as a swipe", () => {
  const detector = new SwipeDetector(DEFAULT_SWIPE);
  const out = [];
  for (let t = 0; t <= 400; t += 33) {
    const jumped = t >= 133;
    out.push(detector.push(t, { x: jumped ? 0.9 : 0.4, y: 0.5 }));
  }
  expect(out.filter(Boolean)).toEqual([]);
});

it("allows a repeat swipe in the same direction once the cooldown has passed", () => {
  const detector = new SwipeDetector(DEFAULT_SWIPE);
  const out: string[] = [];
  const stroke = (t0: number, from: number, to: number) => {
    for (let t = 0; t <= 200; t += 33) {
      const s = detector.push(t0 + t, { x: from + ((to - from) * t) / 200, y: 0.5 });
      if (s) out.push(s);
    }
  };
  stroke(0, 0.8, 0.45);
  for (let t = 233; t < 700; t += 33) detector.push(t, { x: 0.45, y: 0.5 });
  stroke(700, 0.8, 0.45);
  expect(out).toEqual(["left", "left"]);
});

it.each([15, 30, 60])(
  "preserves ordinary-swipe detection and return rejection at %i camera fps",
  (fps) => {
    const result = evaluate(300, undefined, undefined, fps);
    expect(result.detectionRate).toBeGreaterThanOrEqual(0.97);
    expect(result.ghostsPerTrial).toBeLessThan(0.25);
  },
);
