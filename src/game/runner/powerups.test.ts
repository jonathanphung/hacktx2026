import { describe, expect, it } from "vitest";
import { POWERUPS } from "./config";
import {
  PowerupState,
  PowerupBag,
  PowerupDrops,
  POWERUP_DURATION,
  POWERUP_KINDS,
} from "./powerups";

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

describe("bounded pickup frequency", () => {
  it("introduces Blast and Giant Slow first, then avoids consecutive repeats across cycles", () => {
    for (const rng of [() => 0, () => 0.2, () => 0.999999]) {
      const bag = new PowerupBag(rng);
      const drops = Array.from({ length: 200 }, () => bag.next());
      expect(drops.slice(0, 2).sort()).toEqual(["blast", "giant-slow"]);
      for (let i = 1; i < drops.length; i++) expect(drops[i]).not.toBe(drops[i - 1]);
    }
  });

  it("starts five seconds into play and targets seven seconds between drops", () => {
    const drops = new PowerupDrops(() => 0);
    expect(drops.next(1000, [])).toBeNull();
    expect(drops.next(5999, [])).toBeNull();
    expect(drops.next(6000, [])).not.toBeNull();
    expect(drops.next(12999, [])).toBeNull();
    expect(drops.next(13000, [])).not.toBeNull();
  });

  it("retries blocked lanes without consuming the opening pickups", () => {
    const drops = new PowerupDrops(() => 0);
    drops.next(0, []);
    expect(
      drops.next(5000, [
        { lane: 0, y: 100 },
        { lane: 1, y: 100 },
        { lane: 2, y: 100 },
      ]),
    ).toBeNull();
    expect(drops.next(5749, [])).toBeNull();
    const first = drops.next(5750, [
      { lane: 0, y: 100 },
      { lane: 1, y: 100 },
    ]);
    expect(first?.lane).toBe(2);
    const second = drops.next(12750, []);
    expect([first?.kind, second?.kind].sort()).toEqual(["blast", "giant-slow"]);
  });

  it("never releases catch-up bursts after a delayed frame", () => {
    const drops = new PowerupDrops(() => 0);
    drops.next(0, []);
    expect(drops.next(90000, [])).not.toBeNull();
    expect(drops.next(90000, [])).toBeNull();
    expect(drops.next(90016, [])).toBeNull();
    expect(drops.next(96999, [])).toBeNull();
    expect(drops.next(97000, [])).not.toBeNull();
  });

  it("keeps every timed effect shorter than the earliest same-kind repeat", () => {
    // No consecutive identical drops means at least two seven-second intervals.
    const earliestRepeat = 2 * POWERUPS.everyMs;
    expect(Math.max(...Object.values(POWERUP_DURATION))).toBeLessThan(earliestRepeat);
    expect(earliestRepeat - POWERUPS.shieldMs).toBeGreaterThanOrEqual(6000);
    expect(earliestRepeat - POWERUPS.giantSlowMs).toBeGreaterThanOrEqual(6000);
  });
});
