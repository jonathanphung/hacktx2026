import { describe, expect, it } from "vitest";
import { STAGES } from "../shared/stages";
import {
  FINALE,
  PROLOGUE,
  REWARDS,
  TALE_SCENES,
  taleArt,
  letterMarkup,
  acceptsMessage,
} from "./story";
describe("Claude rescue story", () => {
  it("hides every unrecovered letter, including accessible labels", () => {
    for (let count = 0; count <= 6; count++) {
      const markup = letterMarkup(count);
      expect((markup.match(/>\?</g) ?? []).length).toBe(6 - count);
      expect((markup.match(/restored/g) ?? []).length).toBe(count);
    }
    expect(PROLOGUE.some((beat) => beat.text.includes("HACKTX"))).toBe(false);
    expect(STAGES[5].name).not.toContain("HackTX");
  });
  it("only unlocks the cell for the complete message, ignoring case and outer whitespace", () => {
    expect(acceptsMessage("  hacktx  ")).toBe(true);
    for (const value of ["", "HACKT", "HACKXX", "H A C K T X", "CLAUDE"])
      expect(acceptsMessage(value)).toBe(false);
  });
  it("connects five tale interludes to Xen's ending with a reward for each letter", () => {
    expect(TALE_SCENES.map((s) => s.collected)).toEqual([1, 2, 3, 4, 5]);
    expect(REWARDS).toHaveLength(STAGES.length);
    expect(FINALE.every((s) => s.collected === 6)).toBe(true);
    expect(PROLOGUE.map((s) => s.speaker)).toEqual(["JON", "THE GIANT", "JON"]);
    STAGES.forEach((_, i) => expect(taleArt(i)).toContain("<svg"));
    expect(taleArt(5)).toContain("KEEPER");
  });
});
