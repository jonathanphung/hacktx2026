import { STAGES, stageAt, type StageId, type StageInfo } from "../../shared/stages";
import { RUNNER } from "./config";
import { MAX_SPEED } from "./speed";

export interface HazardMix {
  thorns: number;
  rock: number;
  sap: number;
}

/** How one stage plays and looks. Tweak freely; stage-tuning.test.ts guards the invariants. */
export interface StageTuning {
  /** Track speed at the start and end of the stage, as fractions of MAX_SPEED (the 1 s cap). */
  speed: readonly [number, number];
  /** Natural hazard interval (ms) at the start and end of the stage. */
  hazardEveryMs: readonly [number, number];
  /** Chance a hazard wave blocks two lanes instead of one (one lane always stays open). */
  doubleChance: number;
  /** Relative weights of natural hazard kinds. */
  mix: HazardMix;
  /** Sky gradient corners: top-left, top-right, bottom-left, bottom-right. */
  sky: readonly [number, number, number, number];
  /** Tint multiplied over the beanstalk stems (0xffffff = unchanged). */
  stemTint: number;
}

export const STAGE_TUNING: Record<StageId, StageTuning> = {
  garden: {
    speed: [RUNNER.baseSpeed / MAX_SPEED, 0.68],
    hazardEveryMs: [4500, 3800],
    doubleChance: 0,
    mix: { thorns: 0.5, rock: 0.3, sap: 0.2 },
    sky: [0x6966a6, 0xa48fc7, 0xbde5ce, 0xf6d6d9],
    stemTint: 0xffffff,
  },
  climb: {
    speed: [0.72, 0.8],
    hazardEveryMs: [3600, 3000],
    doubleChance: 0.25,
    mix: { thorns: 0.4, rock: 0.35, sap: 0.25 },
    sky: [0x5b4a8b, 0x8a6bb0, 0xf3b88b, 0xf7d0a6],
    stemTint: 0xfff0d8,
  },
  clouds: {
    speed: [0.83, 0.89],
    hazardEveryMs: [3000, 2500],
    doubleChance: 0.4,
    mix: { thorns: 0.35, rock: 0.25, sap: 0.4 },
    sky: [0x7fb6e8, 0xa9d3f5, 0xf4f8ff, 0xe6f0ff],
    stemTint: 0xeafff0,
  },
  castle: {
    speed: [0.91, 0.96],
    hazardEveryMs: [2400, 2050],
    doubleChance: 0.55,
    mix: { thorns: 0.3, rock: 0.5, sap: 0.2 },
    sky: [0x3c3f5c, 0x56597a, 0x8d8fa8, 0xa9a3b8],
    stemTint: 0xc8d0c8,
  },
  starlit: {
    speed: [0.97, 1],
    hazardEveryMs: [2000, 1800],
    doubleChance: 0.7,
    mix: { thorns: 0.4, rock: 0.4, sap: 0.2 },
    sky: [0x0f1236, 0x241a4f, 0x3a2f6b, 0x51407e],
    stemTint: 0xb8c4ff,
  },
};

/** The last stage has no end, so its ramp runs over this many seconds and then holds. */
export const LAST_STAGE_RAMP_SEC = 60;
/** No natural hazards for this long after entering a stage: a breather to take in the change. */
export const STAGE_CALM_MS = 2500;
/** How long the sky and stems take to blend into the new stage's colors. */
export const STAGE_BLEND_MS = 1800;

/** The stage at `elapsedSec` and how far through it the run is (0..1). */
export function stageProgress(elapsedSec: number): { stage: StageInfo; p: number } {
  const stage = stageAt(elapsedSec);
  const next = STAGES[stage.index + 1];
  const length = next ? next.startsAtSec - stage.startsAtSec : LAST_STAGE_RAMP_SEC;
  return { stage, p: Math.min(1, (elapsedSec - stage.startsAtSec) / length) };
}

const lerp = (range: readonly [number, number], p: number) => range[0] + (range[1] - range[0]) * p;

/** Track speed (px/s) after `elapsedSec`, before powerup/obstacle multipliers. */
export function stageSpeed(elapsedSec: number): number {
  const { stage, p } = stageProgress(elapsedSec);
  return Math.min(MAX_SPEED, lerp(STAGE_TUNING[stage.id].speed, p) * MAX_SPEED);
}

/** Natural hazard interval (ms) after `elapsedSec`. */
export function stageHazardInterval(elapsedSec: number): number {
  const { stage, p } = stageProgress(elapsedSec);
  return lerp(STAGE_TUNING[stage.id].hazardEveryMs, p);
}

/** Reports each stage change once, in game-clock order. The first stage isn't a "change". */
export class StageTracker {
  current: StageInfo = STAGES[0];

  /** Returns the new stage when the run enters one, otherwise null. */
  update(elapsedSec: number): StageInfo | null {
    const stage = stageAt(elapsedSec);
    if (stage.index === this.current.index) return null;
    this.current = stage;
    return stage;
  }
}
