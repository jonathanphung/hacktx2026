import { describe, expect, it } from "vitest";
import { RUNNER } from "./config";
import { MAX_SPEED, warningMs } from "./speed";

describe("speed cap", () => {
  it("gives exactly minWarningMs of warning at top speed", () => {
    expect(warningMs(MAX_SPEED)).toBeCloseTo(RUNNER.minWarningMs);
  });

  it("starts below the cap", () => {
    expect(RUNNER.baseSpeed).toBeLessThan(MAX_SPEED);
  });
});
