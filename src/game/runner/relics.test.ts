import { describe, expect, it } from "vitest";
import { RelicPowers } from "./relics";
describe("permanent tale rewards", () => {
  it("unlocks modest bonuses in order and resets for a new run", () => {
    const powers = new RelicPowers();
    expect(powers.jumpFactor).toBe(1);
    expect(powers.wardReady(100000)).toBe(false);
    powers.collect(0);
    expect(powers.jumpFactor).toBe(1.1);
    expect(powers.reach).toBe(0);
    powers.collect(0);
    expect(powers.reach).toBe(18);
    powers.collect(0);
    expect(powers.slowFactor).toBe(0.75);
    powers.collect(0);
    expect(powers.absorb(0)).toBe(true);
    expect(powers.absorb(21999)).toBe(false);
    expect(powers.absorb(22000)).toBe(true);
    powers.collect(23000);
    expect(powers.scoreFactor).toBe(1.15);
    expect(powers.absorb(23000)).toBe(false);
    expect(new RelicPowers().count).toBe(0);
  });
});
