import type { StageId } from "../../shared/stages";

/** Texture family and measured figure height, keeping costumes the same gameplay size. */
export function runnerOutfit(stage: StageId) {
  return stage === "humpty"
    ? { prefix: "runner-humpty", figureHeight: 106 }
    : { prefix: "runner", figureHeight: 96 };
}
