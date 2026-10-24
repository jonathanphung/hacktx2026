import type { InputEvent } from "../shared/input";
import type { HandFrame } from "../shared/vision";
import { LaneAim } from "./gestures/aim";
import { FistTrigger, PoseTrigger } from "./gestures/fire";
import { PalmFilter } from "./gestures/smoothing";
import { getVisionSettings, aimPosition, type VisionSettings } from "./calibration";
import { DEFAULT_SWIPE, SwipeDetector } from "./gestures/swipe";

/** Per-session state, shared by the live camera and rehearsal/recording replay. */
export function createInterpreter(
  emit: (event: InputEvent) => void,
  getSettings: () => VisionSettings = getVisionSettings,
) {
  const fist = new FistTrigger();
  const cards = ["Pointing_Up", "Victory", "Thumb_Up"].map((pose) => new PoseTrigger(pose, 180));
  let settings = getSettings();
  let interpret = buildInterpreter(emit, settings, fist, cards);
  return (frame: HandFrame) => {
    const next = getSettings();
    if (next !== settings) {
      settings = next;
      // Rebuild temporal state: changing settings must not complete a buffered gesture.
      interpret = buildInterpreter(emit, settings, fist, cards);
    }
    return interpret(frame);
  };
}
function buildInterpreter(
  emit: (event: InputEvent) => void,
  settings: VisionSettings,
  fist: FistTrigger,
  cards: PoseTrigger[],
) {
  const swipe = new SwipeDetector({ ...DEFAULT_SWIPE, minDistance: settings.swipeDistance });
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
    const lane = aim.push(p ? aimPosition(p.x, settings.aim) : null);
    if (lane !== null) emit({ player: "saboteur", action: "aim", lane });
    const gesture = p ? f.gesture : null;
    cards.forEach((card, slot) => {
      if (card.push(f.t, gesture)) emit({ player: "saboteur", action: "select", slot });
    });
    if (fist.push(f.t, gesture)) emit({ player: "saboteur", action: "fire" });
    return null;
  };
}
