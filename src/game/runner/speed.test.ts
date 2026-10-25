import { describe, expect, it } from "vitest";
import { RUNNER } from "./config";
import { MAX_SPEED, warningMs } from "./speed";
import { GIANT_RELEASE_Y } from "../../shared/combat";

describe("speed cap", () => {
  it("keeps at least minWarningMs including the hand telegraph at top speed", () => {
    expect(warningMs(MAX_SPEED)).toBeGreaterThanOrEqual(RUNNER.minWarningMs);
    expect(MAX_SPEED).toBe(440);
  });

  it("starts below the cap", () => {
    expect(RUNNER.baseSpeed).toBeLessThan(MAX_SPEED);
  });
  it("drops farther down the beanstalk while retaining telegraph plus travel time", () => {
    expect(GIANT_RELEASE_Y).toBe(220);
    expect(warningMs(MAX_SPEED)).toBeCloseTo(1150);
  });
});
