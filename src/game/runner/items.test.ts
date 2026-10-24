import { describe, expect, it } from "vitest";
import { ITEM_CLEAR_PX, pickItemLane } from "./items";
import { RUNNER } from "./config";
import { MAX_SPEED } from "./speed";

describe("pickItemLane", () => {
  it("never places the item in a lane with an obstacle near the top", () => {
    const obstacles = [
      { lane: 0 as const, y: 100 },
      { lane: 2 as const, y: ITEM_CLEAR_PX - 1 },
    ];
    for (const roll of [0, 0.5, 0.999]) expect(pickItemLane(obstacles, () => roll)).toBe(1);
  });

  it("ignores obstacles already far down the track", () => {
    expect(pickItemLane([{ lane: 1, y: ITEM_CLEAR_PX + 50 }], () => 0.5)).toBe(1);
  });

  it("waits when every lane is busy", () => {
    expect(
      pickItemLane([
        { lane: 0, y: 10 },
        { lane: 1, y: 10 },
        { lane: 2, y: 10 },
      ]),
    ).toBeNull();
  });

  it("leaves time to dodge whatever is below the item and get back, even at top speed", () => {
    // Gap between the item (spawned just above the screen) and the nearest obstacle allowed below it.
    const gapSec = (ITEM_CLEAR_PX + 60) / MAX_SPEED;
    expect(gapSec * 1000).toBeGreaterThanOrEqual(RUNNER.minWarningMs * 0.85);
  });
});
