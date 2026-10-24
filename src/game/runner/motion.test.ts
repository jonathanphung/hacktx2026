import { describe, expect, it } from "vitest";
import { RUNNER } from "./config";
import { jumpHeight, Spring } from "./motion";

/** Runs a spring at 60 fps and returns the time (ms) when `done` first holds. */
function timeUntil(s: Spring, done: (s: Spring) => boolean, maxMs = 1000) {
  for (let t = 0; t <= maxMs; t += 1000 / 60) {
    if (done(s)) return t;
    s.step(1 / 60);
  }
  return Infinity;
}

describe("Spring", () => {
  const lane = RUNNER.laneSpacing;
  // Runner leaves an obstacle's lane once it's moved (obstacle width + hitbox) / 2.
  const clear = (RUNNER.laneSpacing - 30 + RUNNER.hitboxSize) / 2;

  it("clears an obstacle within 60 ms of a lane switch (gesture lag needs every ms)", () => {
    const s = new Spring(0, lane, RUNNER.laneOmega);
    expect(timeUntil(s, (x) => x.value >= clear)).toBeLessThanOrEqual(60);
  });

  it("settles in the new lane quickly and never overshoots", () => {
    const s = new Spring(0, lane, RUNNER.laneOmega);
    let max = 0;
    for (let i = 0; i < 60; i++) max = Math.max(max, s.step(1 / 60));
    expect(max).toBeLessThanOrEqual(lane + 1e-6);
    expect(Math.abs(s.value - lane)).toBeLessThan(0.5);
    expect(Math.abs(s.velocity)).toBeLessThan(5);
  });

  it("reverses smoothly when the target changes mid-move (no velocity jump)", () => {
    const s = new Spring(0, lane, RUNNER.laneOmega);
    s.step(0.03);
    const v = s.velocity;
    s.target = 0;
    s.step(1e-4);
    expect(Math.abs(s.velocity - v)).toBeLessThan(Math.abs(v) * 0.05);
  });

  it("gives the same result for one big step as for many small ones", () => {
    const a = new Spring(0, lane, RUNNER.laneOmega);
    const b = new Spring(0, lane, RUNNER.laneOmega);
    a.step(0.05);
    for (let i = 0; i < 50; i++) b.step(0.001);
    expect(a.value).toBeCloseTo(b.value, 6);
  });
});

describe("jumpHeight", () => {
  it("is a parabola: 0 at both ends, 1 at the apex", () => {
    expect(jumpHeight(0)).toBe(0);
    expect(jumpHeight(0.5)).toBe(1);
    expect(jumpHeight(1)).toBe(0);
    expect(jumpHeight(0.25)).toBeCloseTo(0.75);
  });
});
