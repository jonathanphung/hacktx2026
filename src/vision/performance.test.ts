import { expect, it } from "vitest";
import { percentile, VisionPerformance, type VisionTiming } from "./performance";

const sample = (t: number, roundTripMs: number, runnerHand = true): VisionTiming => ({
  t,
  roundTripMs,
  runnerMs: roundTripMs / 2,
  saboteurMs: roundTripMs,
  runnerHand,
  saboteurHand: false,
  backends: { runner: "worker / GPU", saboteur: "worker / CPU" },
});
it("computes percentiles without changing the measurements", () => {
  const values = [100, 10, 20, 30];
  expect(percentile(values, 0.5)).toBe(20);
  expect(percentile(values, 0.95)).toBe(100);
  expect(values).toEqual([100, 10, 20, 30]);
  expect(percentile([], 0.95)).toBe(0);
});
it("reports measured cadence, latency and tracking coverage independently", () => {
  const stats = new VisionPerformance();
  stats.push(sample(0, 10));
  stats.push(sample(50, 20, false));
  stats.push(sample(100, 30));
  expect(stats.summary()).toMatchObject({
    fps: 20,
    p50: 20,
    p95: 30,
    runnerCoverage: 2 / 3,
    saboteurCoverage: 0,
  });
});
it("bounds memory and expires old stalls", () => {
  const stats = new VisionPerformance();
  stats.push(sample(0, 10000));
  for (let i = 1; i <= 120; i++) stats.push(sample(i * 40, 12));
  expect(stats.summary()).toMatchObject({ frames: 120, fps: 25, p95: 12 });
});
