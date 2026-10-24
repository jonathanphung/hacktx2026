import { describe, expect, it } from "vitest";
import { isLastStage, STAGES } from "./stages";

describe("stages", () => {
  it("are the five tales in order, each with its own item", () => {
    expect(STAGES.map((s) => s.id)).toEqual([
      "humpty",
      "wonderland",
      "cinderella",
      "mermaid",
      "redhood",
    ]);
    expect(STAGES.map((s) => s.item.id)).toEqual(["egg", "potion", "slipper", "trident", "hood"]);
    STAGES.forEach((s, i) => expect(s.index).toBe(i));
  });

  it("knows the last stage", () => {
    expect(isLastStage(STAGES.length - 1)).toBe(true);
    expect(isLastStage(0)).toBe(false);
  });
});
