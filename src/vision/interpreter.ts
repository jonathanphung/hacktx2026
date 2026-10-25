import type { InputEvent } from "../shared/input";
import type { HandFrame } from "../shared/vision";
import { FistTrigger } from "./gestures/fire";
import { effectivePose } from "./gestures/hand-pose";
import { PointTrigger } from "./gestures/point";
import { SaboteurAim } from "./gestures/saboteur-aim";
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
  // These options apply only to P2. P1's detector and input path are unchanged.
  const aimSwipe = new SwipeDetector({ ...swipeOptions, reverseWindowMs: 0, cooldownMs: 120 });
  const aim = new SaboteurAim();
  const lock = new TargetLock();
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
    const wasLocked = lock.locked;
    const lockedLane = lock.push(f.t, gesture, !!p, aim.current);
    if (lockedLane !== null) {
      const lane = aim.set(lockedLane);
      if (lane !== null) emit({ player: "saboteur", action: "aim", lane });
    }
    if (lock.locked) {
      aimSwipe.push(f.t, null);
      point.saboteur.push(f.t, null);
      aim.resetMotion();
    } else {
      if (wasLocked) aim.resumePosition();
      const flick = aimSwipe.push(f.t, raw);
      const pointed = point.saboteur.push(f.t, f.landmarks);
      const swiped = flick === "left" || flick === "right";
      const step = swiped ? flick : pointed === "left" || pointed === "right" ? pointed : null;
      if (swiped) point.saboteur.disarm();
      else if (step) aimSwipe.push(f.t, null);
      const lane = aim.push(
        f.t,
        p ? aimPosition(p.x, settings.aim) : null,
        step,
        !swiped && step !== null,
      );
      if (lane !== null) emit({ player: "saboteur", action: "aim", lane });
    }
    if (fist.push(f.t, gesture)) emit({ player: "saboteur", action: "fire" });
    return null;
  };
}
