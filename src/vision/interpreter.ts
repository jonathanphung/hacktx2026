import type { InputEvent } from "../shared/input";
import type { Lane } from "../shared/types";
import type { HandFrame } from "../shared/vision";
import { LaneAim } from "./gestures/aim";
import { FistTrigger } from "./gestures/fire";
import { effectivePose } from "./gestures/hand-pose";
import { TargetLock } from "./gestures/target-lock";
import { PalmFilter } from "./gestures/smoothing";
import { getVisionSettings, aimPosition, type VisionSettings } from "./calibration";
import { DEFAULT_SWIPE, SwipeDetector } from "./gestures/swipe";

/** Per-session state, shared by the live camera and rehearsal/recording replay. */
export function createInterpreter(
  emit: (event: InputEvent) => void,
  getSettings: () => VisionSettings = getVisionSettings,
) {
  const fist = new FistTrigger();
  let settings = getSettings();
  let interpret = buildInterpreter(emit, settings, fist);
  return (frame: HandFrame) => {
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
  const swipe = new SwipeDetector({ ...DEFAULT_SWIPE, minDistance: settings.swipeDistance });
  const lock = new TargetLock();
  let sentLane: Lane = 1;
  const aim = new LaneAim();
  const filters = { runner: new PalmFilter(), saboteur: new PalmFilter() };
  return (f: HandFrame) => {
    const raw = f.landmarks?.[9] ?? null;
    // Swipes use actual positions; low-pass smoothing is reserved for continuous aiming.
    const p = f.player === "runner" ? raw : filters.saboteur.push(f.t, raw);
    if (f.player === "runner") {
      const direction = swipe.push(f.t, p);
      // Down is recognized in the lab; the shared game contract has no duck action yet.
      if (direction && direction !== "down")
        emit({ player: "runner", action: direction === "up" ? "jump" : direction });
      return direction;
    }
    const gesture = p ? effectivePose(f.gesture, f.landmarks) : null;
    const lockedLane = lock.push(f.t, gesture, !!p, aim.current);
    if (lockedLane !== null) {
      // Fire at the last stable target, not wherever the curling fingers dragged the palm.
      aim.set(lockedLane);
      if (lockedLane !== sentLane) emit({ player: "saboteur", action: "aim", lane: lockedLane });
      sentLane = lockedLane;
    }
    if (!lock.locked) {
      const lane = aim.push(p ? aimPosition(p.x, settings.aim) : null);
      if (lane !== null) {
        sentLane = lane;
        emit({ player: "saboteur", action: "aim", lane });
      }
    }
    if (fist.push(f.t, gesture)) emit({ player: "saboteur", action: "fire" });
    return null;
  };
}
