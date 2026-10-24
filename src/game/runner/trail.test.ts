import { describe, expect, it } from "vitest";
import { TRAIL, TrailSpawner, trailHazard } from "./trail";

describe("natural trail hazards", () => {
  it("gives an opening grace period and spawns without giant input", () => {
    const spawner = new TrailSpawner();
    expect(spawner.due(10000, false)).toBe(false);
    expect(spawner.due(10000 + TRAIL.firstMs - 1, false)).toBe(false);
    expect(spawner.due(10000 + TRAIL.firstMs, false)).toBe(true);
    expect(spawner.due(10000 + TRAIL.firstMs + 100, false)).toBe(false);
  });
  it("defers around recent obstacles instead of stacking at the entrance", () => {
    const spawner = new TrailSpawner();
    spawner.due(0, false);
    expect(spawner.due(TRAIL.firstMs, true)).toBe(false);
    expect(spawner.due(TRAIL.firstMs + TRAIL.retryMs, false)).toBe(true);
  });
  it("does not burst after a large time jump", () => {
    const spawner = new TrailSpawner();
    spawner.due(0, false);
    expect(spawner.due(100000, false)).toBe(true);
    expect(spawner.due(100001, false)).toBe(false);
  });
  it("offers jumpable thorns, dodge-only rocks, and slowing sap", () => {
    expect(trailHazard(0, 0)).toMatchObject({ lane: 0, jumpable: true, effect: "end-run" });
    expect(trailHazard(1, 0.5)).toMatchObject({ lane: 1, jumpable: false, effect: "end-run" });
    expect(trailHazard(2, 0.9)).toMatchObject({ lane: 2, jumpable: true, effect: "slow" });
  });
});
