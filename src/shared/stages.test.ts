import { describe, expect, it } from "vitest";
import { STAGES, stageAt } from "./stages";

describe("stages", () => {
  it("are in order, indexed, and start at 0 s", () => {
    expect(STAGES[0].startsAtSec).toBe(0);
    STAGES.forEach((s, i) => {
      expect(s.index).toBe(i);
      if (i > 0) expect(s.startsAtSec).toBeGreaterThan(STAGES[i - 1].startsAtSec);
    });
  });

  it("maps time survived to a stage, and the last stage never ends", () => {
    expect(stageAt(0).id).toBe("garden");
    expect(stageAt(STAGES[1].startsAtSec - 0.01).id).toBe("garden");
    expect(stageAt(STAGES[1].startsAtSec).id).toBe("climb");
    expect(stageAt(1e6).id).toBe(STAGES[STAGES.length - 1].id);
  });
});
