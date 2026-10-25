import { describe, expect, it } from "vitest";
import { STAGES } from "../../shared/stages";
import { runnerOutfit } from "./outfit";

describe("stage outfit", () => {
  it("wears the egg-emblem costume only in Humpty Dumpty", () => {
    for (const stage of STAGES) {
      expect(runnerOutfit(stage.id).prefix).toBe(
        stage.id === "humpty" ? "runner-humpty" : "runner",
      );
    }
  });

  it("normalizes each costume to the same visible gameplay height", () => {
    expect(runnerOutfit("humpty").figureHeight).toBe(106);
    expect(runnerOutfit("wonderland").figureHeight).toBe(96);
  });
});
