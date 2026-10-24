import { describe, expect, it } from "vitest";
import { STAGES } from "../shared/stages";
import { FINALE, PROLOGUE, REWARDS, TALE_SCENES, taleArt } from "./story";
describe("HACKTX story", () => {
  it("connects five tale interludes to Xen's ending with a reward for each letter", () => {
    expect(TALE_SCENES.map((s) => s.collected)).toEqual([1, 2, 3, 4, 5]);
    expect(REWARDS).toHaveLength(STAGES.length);
    expect(FINALE.every((s) => s.collected === 6)).toBe(true);
    expect(PROLOGUE.map((s) => s.speaker)).toEqual(["JON", "THE GIANT", "JON"]);
    STAGES.forEach((_, i) => expect(taleArt(i)).toContain("<svg"));
    expect(taleArt(5)).toContain("HACKTX");
  });
});
