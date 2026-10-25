import { expect, it } from "vitest";
import { spillLane } from "./spill";

it("slides edge lanes inward even when momentum points off the road", () => {
  expect(spillLane(0, -600)).toBe(1);
  expect(spillLane(2, 600)).toBe(1);
});
it("carries center-lane momentum or chooses either neighboring lane at rest", () => {
  expect(spillLane(1, -100)).toBe(0);
  expect(spillLane(1, 100)).toBe(2);
  expect(spillLane(1, 0, () => 0.1)).toBe(0);
  expect(spillLane(1, 0, () => 0.9)).toBe(2);
});
