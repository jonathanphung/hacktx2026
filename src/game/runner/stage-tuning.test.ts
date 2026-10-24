import { describe, expect, it } from "vitest";
import { STAGES } from "../../shared/stages";
import { RUNNER } from "./config";
import { MAX_SPEED, warningMs } from "./speed";
import {
  LAST_STAGE_RAMP_SEC,
  STAGE_TUNING,
  stageHazardInterval,
  stageSpeed,
  StageTracker,
} from "./stage-tuning";

const last = STAGES[STAGES.length - 1];
const times = Array.from({ length: 600 }, (_, i) => i * 0.5); // 0..300 s

describe("stage speed", () => {
  it("starts at the base speed", () => {
    expect(stageSpeed(0)).toBeCloseTo(RUNNER.baseSpeed);
  });

  it("never drops as the run goes on (each stage starts at or above where the last ended)", () => {
    for (let i = 1; i < times.length; i++) {
      expect(stageSpeed(times[i])).toBeGreaterThanOrEqual(stageSpeed(times[i - 1]) - 1e-9);
    }
  });

  it("always leaves at least minWarningMs to react, in every stage", () => {
    for (const t of times)
      expect(warningMs(stageSpeed(t))).toBeGreaterThanOrEqual(RUNNER.minWarningMs - 1e-6);
  });

  it("reaches top speed in the last stage and holds it", () => {
    expect(stageSpeed(last.startsAtSec + LAST_STAGE_RAMP_SEC)).toBeCloseTo(MAX_SPEED);
    expect(stageSpeed(1e5)).toBeCloseTo(MAX_SPEED);
  });

  it("steps up a little on entering each stage, so the change is felt", () => {
    for (const s of STAGES.slice(1)) {
      expect(stageSpeed(s.startsAtSec)).toBeGreaterThan(stageSpeed(s.startsAtSec - 0.001));
    }
  });
});

describe("stage hazards", () => {
  it("get more frequent stage by stage", () => {
    for (const s of STAGES.slice(1)) {
      expect(stageHazardInterval(s.startsAtSec)).toBeLessThanOrEqual(
        stageHazardInterval(s.startsAtSec - 0.001),
      );
    }
  });

  it("have valid mixes and double-wave chances", () => {
    for (const t of Object.values(STAGE_TUNING)) {
      expect(t.mix.thorns + t.mix.rock + t.mix.sap).toBeGreaterThan(0);
      expect(t.doubleChance).toBeGreaterThanOrEqual(0);
      expect(t.doubleChance).toBeLessThanOrEqual(1);
    }
  });
});

describe("StageTracker", () => {
  it("reports each stage once, in order, and not the first", () => {
    const tracker = new StageTracker();
    const seen: string[] = [];
    for (const t of times) {
      const s = tracker.update(t);
      if (s) seen.push(s.id);
    }
    expect(seen).toEqual(STAGES.slice(1).map((s) => s.id));
  });
});
