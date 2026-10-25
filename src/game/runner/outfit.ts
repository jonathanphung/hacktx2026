import type { StageId } from "../../shared/stages";

export interface RunnerOutfit {
  prefix: string;
  folder: string;
  figureHeight: number;
}

/** Every tale has its own costume. The original wizard belongs only to Xen's Tower. */
export const RUNNER_OUTFITS: Record<StageId, RunnerOutfit> = {
  humpty: { prefix: "runner-humpty", folder: "humpty/", figureHeight: 106 },
  wonderland: { prefix: "runner-alice", folder: "alice/", figureHeight: 110 },
  cinderella: { prefix: "runner-cinderella", folder: "cinderella/", figureHeight: 110 },
  mermaid: { prefix: "runner-kt", folder: "kt/", figureHeight: 114 },
  redhood: { prefix: "runner-redhood", folder: "redhood/", figureHeight: 110 },
  xen: { prefix: "runner", folder: "", figureHeight: 96 },
};

export function runnerOutfit(stage: StageId): RunnerOutfit {
  return RUNNER_OUTFITS[stage];
}

export const HIT_FRAME_MS = 60;
export const HIT_FRAMES = 4;
export const HIT_DURATION_MS = HIT_FRAME_MS * HIT_FRAMES;

/** Select from the one game clock without restarting the running animation. */
export function hitReactionFrame(time: number, until: number): number | null {
  const elapsed = time - (until - HIT_DURATION_MS);
  return elapsed >= 0 && elapsed < HIT_DURATION_MS ? Math.floor(elapsed / HIT_FRAME_MS) : null;
}
