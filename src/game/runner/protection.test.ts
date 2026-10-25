import { describe, expect, it } from "vitest";
import { PowerupState } from "./powerups";
import { RelicPowers } from "./relics";
import { absorbProtection } from "./protection";
import { Spring } from "./motion";
import { RUNNER } from "./config";

describe("runner counterplay", () => {
  const ward = () => {
    const relics = new RelicPowers();
    for (let i = 0; i < 4; i++) relics.collect(0);
    return relics;
  };
  it("consumes pickup and ready ward as one charge", () => {
    const pickups = new PowerupState(),
      relics = ward();
    pickups.activate("shield", 0);
    expect(absorbProtection(pickups, relics, 100)).toBe("pickup");
    expect(absorbProtection(pickups, relics, 501)).toBeNull();
    expect(relics.wardReady(35099)).toBe(false);
    expect(absorbProtection(pickups, relics, 35100)).toBe("ward");
  });
  it("cannot chain a pickup into a ward that was about to recharge", () => {
    const pickups = new PowerupState(),
      relics = ward();
    absorbProtection(pickups, relics, 0);
    pickups.activate("shield", 34000);
    expect(absorbProtection(pickups, relics, 34000)).toBe("pickup");
    expect(absorbProtection(pickups, relics, 35000)).toBeNull();
    expect(relics.wardReady(69000)).toBe(true);
  });
  it("makes lateral escape slower without changing the road-speed powerup factor", () => {
    const normal = new Spring(0, 170, RUNNER.laneOmega),
      slowed = new Spring(0, 170, RUNNER.laneOmega);
    normal.step(0.05);
    slowed.step(0.05, RUNNER.laneOmega * RUNNER.slowFactor);
    expect(slowed.value).toBeLessThan(normal.value);
    expect(new PowerupState().speedFactor(1000)).toBe(1);
  });
});
