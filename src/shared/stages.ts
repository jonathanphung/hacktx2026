/** The stages of an endless run, in order. Time survived moves the run to the next one. */
export type StageId = "garden" | "climb" | "clouds" | "castle" | "starlit";

export interface StageInfo {
  index: number;
  id: StageId;
  name: string;
  /** Seconds survived when this stage begins. The last stage never ends. */
  startsAtSec: number;
}

export const STAGES: readonly StageInfo[] = [
  { index: 0, id: "garden", name: "The Garden Gate", startsAtSec: 0 },
  { index: 1, id: "climb", name: "The Climb", startsAtSec: 35 },
  { index: 2, id: "clouds", name: "Above the Clouds", startsAtSec: 80 },
  { index: 3, id: "castle", name: "The Giant's Castle", startsAtSec: 130 },
  { index: 4, id: "starlit", name: "Starlit Sky", startsAtSec: 190 },
];

/** The stage a run is in after `elapsedSec` seconds. */
export function stageAt(elapsedSec: number): StageInfo {
  let stage = STAGES[0];
  for (const s of STAGES) if (elapsedSec >= s.startsAtSec) stage = s;
  return stage;
}
