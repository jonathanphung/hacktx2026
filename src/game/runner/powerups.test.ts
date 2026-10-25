import { describe, expect, it } from "vitest";
import { POWERUPS } from "./config";
import { PowerupState, PowerupBag, POWERUP_KINDS } from "./powerups";

describe("PowerupState", () => {
  it("is active for its duration, then expires once", () => {
    const p = new PowerupState();
    p.activate("double", 1000);
    expect(p.scoreFactor(1000 + POWERUPS.doubleMs - 1)).toBe(2);
    expect(p.expire(1000 + POWERUPS.doubleMs - 1)).toEqual([]);
    expect(p.expire(1000 + POWERUPS.doubleMs)).toEqual(["double"]);
    expect(p.expire(1000 + POWERUPS.doubleMs + 1)).toEqual([]);
    expect(p.scoreFactor(1000 + POWERUPS.doubleMs)).toBe(1);
  });

  it("slowmo slows the track", () => {
    const p = new PowerupState();
    expect(p.speedFactor(0)).toBe(1);
    p.activate("slowmo", 0);
    expect(p.speedFactor(1)).toBe(POWERUPS.slowmoFactor);
  });

  it("shield absorbs exactly one hit", () => {
    const p = new PowerupState();
    expect(p.absorbHit(0)).toBe(false);
    p.activate("shield", 0);
    expect(p.absorbHit(10)).toBe(true);
    expect(p.absorbHit(20)).toBe(false);
    expect(p.expire(POWERUPS.shieldMs + 1)).toEqual([]); // used up, so it doesn't also "expire"
  });

  it("shield stops working after it times out", () => {
    const p = new PowerupState();
    p.activate("shield", 0);
    expect(p.absorbHit(POWERUPS.shieldMs)).toBe(false);
  });

  it("picking up the same powerup again refreshes its timer", () => {
    const p = new PowerupState();
    p.activate("double", 0);
    p.activate("double", 5000);
    expect(p.scoreFactor(POWERUPS.doubleMs + 1000)).toBe(2);
  });
});

it("adds instant Blast and an eight-second Giant Slow while retaining Slow Drain", () => {
  const p = new PowerupState();
  p.activate("blast", 0);
  expect(p.isActive("blast", 0)).toBe(false);
  expect(p.expire(1)).toEqual([]);
  p.activate("giant-slow", 100);
  expect(p.isActive("giant-slow", 8099)).toBe(true);
  expect(p.expire(8100)).toEqual(["giant-slow"]);
  p.activate("double", 9000);
  expect(p.scoreFactor(9001)).toBe(2); // Main uses this factor to slow pot drain, not multiply scores.
});
it("Time Slow freezes hazards for 450ms and still slows time afterward", () => {
  const p = new PowerupState();
  p.activate("slowmo", 100);
  expect(p.hazardsFrozen(549)).toBe(true);
  expect(p.hazardsFrozen(550)).toBe(false);
  expect(p.speedFactor(551)).toBe(POWERUPS.slowmoFactor);
});

it("spawns every pickup once per five-drop cycle even with extreme random values", () => {
  for (const rng of [() => 0, () => 0.999999]) {
    const bag = new PowerupBag(rng);
    for (let cycle = 0; cycle < 20; cycle++) {
      const kinds = Array.from({ length: POWERUP_KINDS.length }, () => bag.next());
      expect([...kinds].sort()).toEqual([...POWERUP_KINDS].sort());
    }
  }
});
