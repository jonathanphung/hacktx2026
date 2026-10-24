import { isLastStage, STAGES, type StageId, type StageInfo } from "../../shared/stages";
import { RUNNER } from "./config";
import { MAX_SPEED } from "./speed";

export interface HazardMix {
  thorns: number;
  rock: number;
  sap: number;
}

/** How one stage plays and looks. Tweak freely; stage-tuning.test.ts guards the invariants. */
export interface StageTuning {
  /** Track speed on entering the stage and after STAGE_RAMP_SEC in it, as fractions of MAX_SPEED. */
  speed: readonly [number, number];
  /** Natural hazard interval (ms) on entering the stage and after STAGE_RAMP_SEC in it. */
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
  // Humpty Dumpty: a sunny morning by the king's wall.
  humpty: {
    speed: [RUNNER.baseSpeed / MAX_SPEED, 0.68],
    hazardEveryMs: [4500, 3800],
    doubleChance: 0,
    mix: { thorns: 0.4, rock: 0.45, sap: 0.15 },
    sky: [0x86c5f0, 0xa8d8f5, 0xf7e7b4, 0xf3d9a0],
    stemTint: 0xffffff,
  },
  // Alice in Wonderland: a curious violet-and-teal twilight.
  wonderland: {
    speed: [0.72, 0.8],
    hazardEveryMs: [3600, 3000],
    doubleChance: 0.25,
    mix: { thorns: 0.35, rock: 0.25, sap: 0.4 },
    sky: [0x5b3c88, 0x2f8f9d, 0xf2a7c3, 0xffd6e8],
    stemTint: 0xffd6f5,
  },
  // Cinderella: midnight blue and silver at the ball.
  cinderella: {
    speed: [0.83, 0.89],
    hazardEveryMs: [3000, 2500],
    doubleChance: 0.4,
    mix: { thorns: 0.4, rock: 0.35, sap: 0.25 },
    sky: [0x1d2a6b, 0x3b4a9b, 0x9fb4ff, 0xd9e1ff],
    stemTint: 0xd8e4ff,
  },
  // The Little Mermaid: deep sea greens and blues.
  mermaid: {
    speed: [0.91, 0.96],
    hazardEveryMs: [2400, 2050],
    doubleChance: 0.55,
    mix: { thorns: 0.3, rock: 0.3, sap: 0.4 },
    sky: [0x0d4f6e, 0x127a8c, 0x3fb8b0, 0x8ee0d0],
    stemTint: 0xb8fff0,
  },
  // Little Red Riding Hood: the dark woods at dusk.
  redhood: {
    speed: [0.97, 1],
    hazardEveryMs: [2000, 1800],
    doubleChance: 0.7,
    mix: { thorns: 0.45, rock: 0.4, sap: 0.15 },
    sky: [0x1f2d1f, 0x3a2a2a, 0x7a3b2e, 0x2e3d2a],
    stemTint: 0xc8b8a8,
  },
};

/** Within a stage, speed and hazard frequency ramp over this many seconds, then hold. */
export const STAGE_RAMP_SEC = 30;
/** No natural hazards for this long after entering a stage: a breather to take in the change. */
export const STAGE_CALM_MS = 2500;
/** How long the sky and stems take to blend into the new stage's colors. */
export const STAGE_BLEND_MS = 1800;

/** The key item for each stage. */
export const STAGE_ITEM = {
  /** A new item appears this long (random within the range) after the previous one did. */
  spawnEveryMs: [10_000, 15_000] as const,
  /** Pickup size in px; collected on any overlap with the runner, jumping or not. */
  size: 60,
  /** If no lane is clear at spawn time, try again after this long. */
  retryMs: 400,
  /** No natural hazards spawn for this long after an item appears, so it's always reachable. */
  hazardHoldMs: 1400,
  /** Score bonus for each item collected in the last stage (the storybook is complete). */
  finalBonus: 500,
};

const lerp = (range: readonly [number, number], p: number) => range[0] + (range[1] - range[0]) * p;
const rampOf = (secInStage: number) => Math.min(1, Math.max(0, secInStage) / STAGE_RAMP_SEC);

/** Track speed (px/s) after `secInStage` seconds in a stage, before powerup/obstacle multipliers. */
export function stageSpeed(stage: StageId, secInStage: number): number {
  return Math.min(MAX_SPEED, lerp(STAGE_TUNING[stage].speed, rampOf(secInStage)) * MAX_SPEED);
}

/** Natural hazard interval (ms) after `secInStage` seconds in a stage. */
export function stageHazardInterval(stage: StageId, secInStage: number): number {
  return lerp(STAGE_TUNING[stage].hazardEveryMs, rampOf(secInStage));
}

/**
 * Which stage the run is in, and when its key item appears. Pure logic (no Phaser): the
 * runner asks `itemDue` each frame and reports back with `itemGone`.
 */
export class StageRun {
  index = 0;
  /** Game-clock ms when the current stage began (-1 until the first update). */
  enteredAt = -1;
  itemOnTrack = false;
  private nextItemAt = -1;

  constructor(private rng: () => number = Math.random) {}

  get stage(): StageInfo {
    return STAGES[this.index];
  }

  secInStage(now: number): number {
    return this.enteredAt < 0 ? 0 : (now - this.enteredAt) / 1000;
  }

  /** True when the stage item should appear now. Call `spawnBlocked` if it can't. */
  itemDue(now: number): boolean {
    if (this.enteredAt < 0) {
      this.enteredAt = now;
      this.schedule(now);
    }
    if (this.itemOnTrack || now < this.nextItemAt) return false;
    this.itemOnTrack = true;
    this.schedule(now);
    return true;
  }

  /** No lane was clear: try again shortly instead of waiting a whole interval. */
  spawnBlocked(now: number): void {
    this.itemOnTrack = false;
    this.nextItemAt = now + STAGE_ITEM.retryMs;
  }

  /** The item left the track. Returns the new stage if collecting it advanced the run. */
  itemGone(now: number, collected: boolean): StageInfo | null {
    this.itemOnTrack = false;
    if (!collected || isLastStage(this.index)) return null;
    this.index++;
    this.enteredAt = now;
    this.schedule(now);
    return this.stage;
  }

  private schedule(from: number) {
    const [min, max] = STAGE_ITEM.spawnEveryMs;
    this.nextItemAt = from + min + (max - min) * this.rng();
  }
}
