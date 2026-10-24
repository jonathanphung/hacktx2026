import { describe, expect, it } from "vitest";
import { STAGES } from "../../shared/stages";
import { RUNNER } from "./config";
import { MAX_SPEED, warningMs } from "./speed";
import {
  STAGE_ITEM,
  STAGE_RAMP_SEC,
  STAGE_TUNING,
  stageHazardInterval,
  stageSpeed,
  StageRun,
} from "./stage-tuning";

const ids = STAGES.map((s) => s.id);
const secs = Array.from({ length: 120 }, (_, i) => i * 0.5); // 0..60 s in a stage

describe("stage speed", () => {
  it("starts the run at the base speed", () => {
    expect(stageSpeed("humpty", 0)).toBeCloseTo(RUNNER.baseSpeed);
  });

  it("ramps up within a stage, then holds", () => {
    for (const id of ids) {
      for (let i = 1; i < secs.length; i++) {
        expect(stageSpeed(id, secs[i])).toBeGreaterThanOrEqual(stageSpeed(id, secs[i - 1]) - 1e-9);
      }
      expect(stageSpeed(id, STAGE_RAMP_SEC)).toBeCloseTo(stageSpeed(id, 1e5));
    }
  });

  it("each stage starts faster than the previous one can ever get (moving on is felt)", () => {
    for (let i = 1; i < ids.length; i++) {
      expect(stageSpeed(ids[i], 0)).toBeGreaterThan(stageSpeed(ids[i - 1], 1e5));
    }
  });

  it("always leaves at least minWarningMs to react, in every stage", () => {
    for (const id of ids)
      for (const t of secs)
        expect(warningMs(stageSpeed(id, t))).toBeGreaterThanOrEqual(RUNNER.minWarningMs - 1e-6);
    expect(stageSpeed(ids[ids.length - 1], 1e5)).toBeCloseTo(MAX_SPEED);
  });
});

describe("stage hazards", () => {
  it("are more frequent in each stage than at any point in the previous one", () => {
    for (let i = 1; i < ids.length; i++) {
      expect(stageHazardInterval(ids[i], 0)).toBeLessThanOrEqual(
        stageHazardInterval(ids[i - 1], 1e5),
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

describe("StageRun", () => {
  const [MIN, MAX] = STAGE_ITEM.spawnEveryMs;

  /** Steps a run frame by frame and returns the times its item became due. */
  function dueTimes(run: StageRun, fromMs: number, toMs: number, onDue?: (t: number) => void) {
    const out: number[] = [];
    for (let t = fromMs; t <= toMs; t += 10) {
      if (run.itemDue(t)) {
        out.push(t);
        onDue?.(t);
      }
    }
    return out;
  }

  it("brings out the first item 10–15 s into the stage", () => {
    for (const roll of [0, 0.5, 0.999]) {
      const run = new StageRun(() => roll);
      const [first] = dueTimes(run, 1000, 40_000);
      expect(first - 1000).toBeGreaterThanOrEqual(MIN);
      expect(first - 1000).toBeLessThanOrEqual(MAX + 10);
    }
  });

  it("never has two items out at once, and spawns every 10–15 s while they're missed", () => {
    const run = new StageRun(() => 0.5);
    const times = dueTimes(run, 0, 60_000);
    expect(times).toHaveLength(1); // the first is still on the track: no second one
    run.itemGone(times[0] + 2500, false);
    const next = dueTimes(run, times[0] + 2510, 60_000);
    expect(next[0] - times[0]).toBeGreaterThanOrEqual(MIN);
    expect(next[0] - times[0]).toBeLessThanOrEqual(MAX + 10);
  });

  it("only moves to the next stage when the item is collected", () => {
    const run = new StageRun(() => 0);
    const [t] = dueTimes(run, 0, 20_000);
    expect(run.itemGone(t + 2000, false)).toBeNull();
    expect(run.index).toBe(0);
    const [t2] = dueTimes(run, t + 2010, 40_000);
    const next = run.itemGone(t2 + 2000, true);
    expect(next?.id).toBe("wonderland");
    expect(run.index).toBe(1);
    expect(run.secInStage(t2 + 2000)).toBe(0);
  });

  it("goes through every tale in order and stays in the last one", () => {
    const run = new StageRun(() => 0);
    const seen = [run.stage.id];
    let t = 0;
    for (let i = 0; i < STAGES.length + 2; i++) {
      [t] = dueTimes(run, t, t + 20_000);
      const next = run.itemGone(t + 1000, true);
      if (next) seen.push(next.id);
    }
    expect(seen).toEqual(ids);
    expect(run.index).toBe(STAGES.length - 1);
  });

  it("retries soon when the item couldn't be placed", () => {
    const run = new StageRun(() => 0);
    const [t] = dueTimes(run, 0, 20_000);
    run.spawnBlocked(t);
    const [retry] = dueTimes(run, t + 10, t + 5000);
    expect(retry - t).toBeLessThanOrEqual(STAGE_ITEM.retryMs + 10);
  });
});
