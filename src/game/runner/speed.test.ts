import { describe, expect, it } from "vitest";
import { RUNNER } from "./config";
import { MAX_SPEED, speedAt, warningMs } from "./speed";

describe("speed", () => {
  it("starts at the base speed and ramps up", () => {
    expect(speedAt(0)).toBe(RUNNER.baseSpeed);
    expect(speedAt(10)).toBe(RUNNER.baseSpeed + 10 * RUNNER.accel);
  });

  it("never exceeds the cap, however long the run", () => {
    expect(speedAt(10_000)).toBe(MAX_SPEED);
  });

  it("always leaves at least minWarningMs to react", () => {
    for (const t of [0, 30, 60, 120, 600]) {
      expect(warningMs(speedAt(t))).toBeGreaterThanOrEqual(RUNNER.minWarningMs - 1e-9);
    }
  });

  it("the cap is reachable in a normal-length run (under 2 minutes)", () => {
    expect((MAX_SPEED - RUNNER.baseSpeed) / RUNNER.accel).toBeLessThan(120);
  });
});
