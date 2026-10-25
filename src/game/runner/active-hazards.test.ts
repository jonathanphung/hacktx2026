import { expect, it } from "vitest";
import { HazardMotion, hazardSpeed, crossesRunner } from "./active-hazards";
import { RUNNER } from "./config";
import { GIANT_RELEASE_Y, GIANT_WINDUP_MS } from "../../shared/combat";
it.each(["fireball", "hurdle"])(
  "accelerates %s faster than the track while preserving the warning floor",
  (kind) => {
    expect(hazardSpeed(kind, 800, 260)).toBeGreaterThan(260);
    expect(hazardSpeed(kind, 800, 260)).toBeGreaterThan(hazardSpeed(kind, 0, 260));
    const height = kind === "fireball" ? 72 : 24;
    for (const speed of [260, 400, 440, 1000]) {
      const maximum = hazardSpeed(kind, 10000, speed);
      const warning =
        GIANT_WINDUP_MS +
        ((RUNNER.runnerY - GIANT_RELEASE_Y - (height + RUNNER.hitboxSize) / 2) / maximum) * 1000;
      expect(warning).toBeGreaterThanOrEqual(RUNNER.minWarningMs - 1e-8);
    }
  },
);
it("keeps solid and surface obstacles at track speed; slows and freezes projectiles too", () => {
  expect(hazardSpeed("barrier", 1000, 300)).toBe(300);
  const motion = new HazardMotion("fireball");
  const before = motion.advance(220, 0.1, 440, 1, false);
  const age = motion.ageMs;
  expect(motion.advance(before, 1, 264, 0.6, true)).toBe(before);
  expect(motion.velocity).toBe(0);
  expect(motion.ageMs).toBe(age);
  expect(hazardSpeed("fireball", 10000, 264, 0.6)).toBeCloseTo(
    hazardSpeed("fireball", 10000, 440) * 0.6,
  );
});
it("detects swept crossings even when a frame skips over the runner", () => {
  expect(crossesRunner(480, 720, 24)).toBe(true);
  expect(crossesRunner(100, 200, 24)).toBe(false);
  expect(crossesRunner(700, 740, 24)).toBe(false);
});
it("rewards a real clean log jump once, after its trailing edge clears; never a dodge or shield hit", () => {
  const motion = new HazardMotion("hurdle");
  motion.noteJump(true, true);
  expect(motion.cleanJumpPoints(610, 24, false)).toBe(0);
  expect(motion.cleanJumpPoints(670, 24, false)).toBe(50);
  expect(motion.cleanJumpPoints(690, 24, false)).toBe(0);
  const dodge = new HazardMotion("hurdle");
  dodge.noteJump(false, true);
  expect(dodge.cleanJumpPoints(670, 24, false)).toBe(0);
  const shielded = new HazardMotion("hurdle");
  shielded.noteJump(true, true);
  expect(shielded.cleanJumpPoints(670, 24, true)).toBe(0);
});
