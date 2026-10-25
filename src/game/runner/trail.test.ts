import { describe, expect, it } from "vitest";
import { TRAIL, TrailSpawner, trailHazard, naturalLanes } from "./trail";

describe("natural trail hazards", () => {
  it("waits the interval it is given between waves", () => {
    const spawner = new TrailSpawner();
    spawner.due(0, false, 3000);
    expect(spawner.due(TRAIL.firstMs, false, 3000)).toBe(true);
    expect(spawner.due(TRAIL.firstMs + 2999, false, 3000)).toBe(false);
    expect(spawner.due(TRAIL.firstMs + 3000, false, 3000)).toBe(true);
  });
  it("holds off during a calm period", () => {
    const spawner = new TrailSpawner();
    spawner.due(0, false, 1000);
    spawner.holdUntil(TRAIL.firstMs + 2500);
    expect(spawner.due(TRAIL.firstMs, false, 1000)).toBe(false);
    expect(spawner.due(TRAIL.firstMs + 2500, false, 1000)).toBe(true);
  });
  it("follows a stage's hazard mix", () => {
    const rocksOnly = { thorns: 0, rock: 1, sap: 0 };
    for (const roll of [0, 0.5, 0.999])
      expect(trailHazard(1, roll, rocksOnly).kind).toBe("moss-rock");
  });
  it("uses distinct lanes and always leaves an escape lane", () => {
    for (const roll of [0, 0.5, 0.999]) {
      const lanes = naturalLanes(2, () => roll);
      expect(new Set(lanes).size).toBe(2);
      expect(lanes.every((l) => l >= 0 && l <= 2)).toBe(true);
    }
    expect(naturalLanes(1, () => 0.5)).toHaveLength(1);
  });
  it("gives an opening grace period and spawns without giant input", () => {
    const spawner = new TrailSpawner();
    expect(spawner.due(10000, false, 4000)).toBe(false);
    expect(spawner.due(10000 + TRAIL.firstMs - 1, false, 4000)).toBe(false);
    expect(spawner.due(10000 + TRAIL.firstMs, false, 4000)).toBe(true);
    expect(spawner.due(10000 + TRAIL.firstMs + 100, false, 4000)).toBe(false);
  });
  it("defers around recent obstacles instead of stacking at the entrance", () => {
    const spawner = new TrailSpawner();
    spawner.due(0, false, 4000);
    expect(spawner.due(TRAIL.firstMs, true, 4000)).toBe(false);
    expect(spawner.due(TRAIL.firstMs + TRAIL.retryMs, false, 4000)).toBe(true);
  });
  it("does not burst after a large time jump", () => {
    const spawner = new TrailSpawner();
    spawner.due(0, false, 4000);
    expect(spawner.due(100000, false, 4000)).toBe(true);
    expect(spawner.due(100001, false, 4000)).toBe(false);
  });
  it("offers jumpable thorns, dodge-only rocks, and slowing sap", () => {
    expect(trailHazard(0, 0)).toMatchObject({ lane: 0, jumpable: true, effect: "end-run" });
    expect(trailHazard(1, 0.5)).toMatchObject({ lane: 1, jumpable: false, effect: "end-run" });
    expect(trailHazard(2, 0.9)).toMatchObject({ lane: 2, jumpable: false, effect: "slow" });
  });
});
