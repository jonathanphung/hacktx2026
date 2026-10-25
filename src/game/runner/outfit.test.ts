import { describe, expect, it } from "vitest";
import { STAGES } from "../../shared/stages";
import { HIT_DURATION_MS, hitReactionFrame, runnerOutfit } from "./outfit";

describe("story costumes", () => {
  it("gives each stage a distinct outfit and reserves the base wizard for Xen", () => {
    expect(new Set(STAGES.map((s) => runnerOutfit(s.id).prefix)).size).toBe(STAGES.length);
    for (const stage of STAGES) {
      expect(runnerOutfit(stage.id).prefix === "runner").toBe(stage.id === "xen");
    }
    expect(runnerOutfit("wonderland").folder).toBe("alice/");
    expect(runnerOutfit("mermaid").folder).toBe("kt/");
    expect(runnerOutfit("cinderella").folder).toBe("cinderella/");
  });
});

describe("hit reaction clock", () => {
  it("plays all four frames once, then returns control to the stride", () => {
    const until = 500 + HIT_DURATION_MS;
    expect([500, 559, 560, 619, 620, 679, 680, 739].map((t) => hitReactionFrame(t, until))).toEqual(
      [0, 0, 1, 1, 2, 2, 3, 3],
    );
    expect(hitReactionFrame(740, until)).toBeNull();
    expect(hitReactionFrame(900, until)).toBeNull();
  });

  it("does not display a reaction before a hit or after stage state resets", () => {
    expect(hitReactionFrame(0, -Infinity)).toBeNull();
    expect(hitReactionFrame(499, 740)).toBeNull();
  });

  it("uses the newest impact time for a second hit", () => {
    expect(hitReactionFrame(650, 740)).toBe(2);
    expect(hitReactionFrame(650, 650 + HIT_DURATION_MS)).toBe(0);
  });
});
