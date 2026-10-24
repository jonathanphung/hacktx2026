import type { InputEvent } from "../shared/input";
import type { Lane } from "../shared/types";
import type { HandFrame } from "../shared/vision";
import { LaneAim } from "./gestures/aim";
import { FistTrigger } from "./gestures/fire";
import { effectivePose } from "./gestures/hand-pose";
import { PointTrigger } from "./gestures/point";
import { StickyAim } from "./gestures/sticky-aim";
import { ZoneNudge } from "./gestures/zone";
import { TargetLock } from "./gestures/target-lock";
import { PalmFilter } from "./gestures/smoothing";
import { getVisionSettings, aimPosition, type VisionSettings } from "./calibration";
import { DEFAULT_SWIPE, SwipeDetector } from "./gestures/swipe";

/**
 * A hand moving fast blurs and the tracker briefly reports "no hand" mid-gesture. Treating that
 * as the hand leaving would wipe the stroke, release a target lock and restart every hold. So a
 * "no hand" frame within this long of the last real one is skipped, as if it were never taken:
 * the detectors just see a slightly longer gap between two real frames.
 */
export const DROPOUT_BRIDGE_MS = 140;

/** Per-session state, shared by the live camera and rehearsal/recording replay. */
export function createInterpreter(
  emit: (event: InputEvent) => void,
  getSettings: () => VisionSettings = getVisionSettings,
) {
  const fist = new FistTrigger();
  let settings = getSettings();
  let interpret = buildInterpreter(emit, settings, fist);
  const lastSeen: Record<string, number> = {};
  return (frame: HandFrame) => {
    if (frame.landmarks) lastSeen[frame.player] = frame.t;
    else if (frame.t - (lastSeen[frame.player] ?? -Infinity) <= DROPOUT_BRIDGE_MS) {
      const seenAt = lastSeen[frame.player];
      if (frame.t >= seenAt) return null;
    }
    const next = getSettings();
    if (next !== settings) {
      settings = next;
      // Rebuild temporal state: changing settings must not complete a buffered gesture.
      interpret = buildInterpreter(emit, settings, fist);
    }
    return interpret(frame);
  };
}
function buildInterpreter(
  emit: (event: InputEvent) => void,
  settings: VisionSettings,
  fist: FistTrigger,
) {
  const swipeOptions = { ...DEFAULT_SWIPE, minDistance: settings.swipeDistance };
  // Runner: three ways to say "left / right / jump": swipe, point, or lean the hand to a side.
  const swipe = new SwipeDetector(swipeOptions);
  const point = { runner: new PointTrigger(), saboteur: new PointTrigger() };
  const lean = new ZoneNudge();
  // Saboteur: the palm's position aims, and a swipe or point also nudges the target a lane.
  const aimSwipe = new SwipeDetector(swipeOptions);
  const sticky = new StickyAim();
  let stepDirection = 0;
  const lock = new TargetLock();
  let sentLane: Lane = 1;
  const laneHistory: { t: number; lane: Lane }[] = [];
  const laneAt = (t: number): Lane => {
    let lane = laneHistory[0]?.lane ?? sentLane;
    for (const sample of laneHistory) if (sample.t <= t) lane = sample.lane;
    return lane;
  };
  const setLane = (t: number, lane: Lane) => {
    sentLane = lane;
    laneHistory.push({ t, lane });
    while (laneHistory.length > 1 && t - laneHistory[1].t > 1000) laneHistory.shift();
  };
  const aim = new LaneAim();
  const filters = { runner: new PalmFilter(), saboteur: new PalmFilter() };
  return (f: HandFrame) => {
    const raw = f.landmarks?.[9] ?? null;
    // Swipes use actual positions; low-pass smoothing is reserved for continuous aiming.
    const p = f.player === "runner" ? raw : filters.saboteur.push(f.t, raw);
    if (f.player === "runner") {
      const direction = swipe.push(f.t, p);
      const pointed = point.runner.push(f.t, f.landmarks);
      const leaned = lean.push(f.t, p ? p.x : null);
      // Down is recognized in the lab; the shared game contract has no duck action yet.
      const command = direction && direction !== "down" ? direction : (pointed ?? leaned);
      if (direction) {
        // The hand a swipe leaves pointing or at the edge must not fire a second command.
        point.runner.disarm();
        lean.disarm();
      } else if (pointed) lean.disarm();
      if (command) emit({ player: "runner", action: command === "up" ? "jump" : command });
      return direction ?? command;
    }
    const gesture = p ? effectivePose(f.gesture, f.landmarks) : null;
    const lockedLane = lock.push(f.t, gesture, !!p, aim.current);
    if (lockedLane !== null) {
      // Fire at the last stable target, not wherever the curling fingers dragged the palm.
      aim.set(lockedLane);
      if (lockedLane !== sentLane) emit({ player: "saboteur", action: "aim", lane: lockedLane });
      setLane(f.t, lockedLane);
    }
    if (lock.locked) {
      aimSwipe.push(f.t, null);
      point.saboteur.push(f.t, null);
    } else {
      const held = sticky.push(f.t, p ? p.x : null);
      let lane = aim.push(p ? aimPosition(p.x, settings.aim) : null);
      // While a step is held, the palm may only carry the target further the way the step
      // went (a long slide); drift back toward the lane under the hand is ignored.
      if (held && lane !== null && (lane - sentLane) * stepDirection <= 0) {
        aim.set(sentLane);
        lane = null;
      }
      if (lane !== null) {
        setLane(f.t, lane);
        emit({ player: "saboteur", action: "aim", lane });
      }
      const flick = aimSwipe.push(f.t, raw);
      const pointed = point.saboteur.push(f.t, f.landmarks);
      const step =
        flick === "left" || flick === "right" ? flick : pointed === "up" ? null : pointed;
      if (step) {
        // Step from the lane aimed when the stroke began, never past where the palm position
        // already took the target, so a fast slide across lanes isn't counted twice.
        const from = flick ? laneAt(f.t - swipeOptions.windowMs) : sentLane;
        const next = (
          step === "left" ? Math.min(sentLane, from - 1) : Math.max(sentLane, from + 1)
        ) as number;
        const target = Math.min(2, Math.max(0, next)) as Lane;
        if (flick) point.saboteur.disarm();
        else aimSwipe.push(f.t, null);
        if (target !== sentLane) emit({ player: "saboteur", action: "aim", lane: target });
        aim.set(target);
        setLane(f.t, target);
        stepDirection = step === "left" ? -1 : 1;
        sticky.engage();
      }
    }
    if (fist.push(f.t, gesture)) emit({ player: "saboteur", action: "fire" });
    return null;
  };
}
