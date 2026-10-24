import { describe, expect, it } from "vitest";
import { isLastStage, STAGES, STORY_LETTERS } from "./stages";

describe("stages", () => {
  it("are five tales plus Xen, spelling HACKTX", () => {
    expect(STAGES.map((s) => s.id)).toEqual([
      "humpty",
      "wonderland",
      "cinderella",
      "mermaid",
      "redhood",
      "xen",
    ]);
    expect(STAGES.map((s) => s.item.id)).toEqual([
      "egg",
      "potion",
      "slipper",
      "trident",
      "hood",
      "badge",
    ]);
    expect(STORY_LETTERS).toBe("HACKTX");
    expect(STAGES).toHaveLength(STORY_LETTERS.length);
    STAGES.forEach((s, i) => expect(s.index).toBe(i));
  });

  it("knows the last stage", () => {
    expect(isLastStage(STAGES.length - 1)).toBe(true);
    expect(isLastStage(0)).toBe(false);
  });
});
