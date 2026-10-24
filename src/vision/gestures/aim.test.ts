import { describe, expect, it } from "vitest";
import { LaneAim } from "./aim";

describe("LaneAim", () => {
  it("maps thirds to lanes", () => {
    const aim = new LaneAim();
    expect(aim.push(0.1)).toBe(0);
    expect(aim.push(0.9)).toBe(2);
    expect(aim.push(0.5)).toBe(1);
  });

  it("does not flicker near a boundary", () => {
    const aim = new LaneAim();
    expect(aim.push(0.35)).toBeNull(); // still lane 1 (inside margin)
    expect(aim.push(0.31)).toBeNull();
    expect(aim.push(0.25)).toBe(0);
    expect(aim.push(0.36)).toBeNull(); // back near the boundary: stays 0
  });

  it("ignores missing hands", () => {
    expect(new LaneAim().push(null)).toBeNull();
  });
});
