import type { InputEvent } from "../shared/input";
import type { HandFrame } from "../shared/vision";
import { LaneAim } from "./gestures/aim";
import { FistTrigger, PoseTrigger } from "./gestures/fire";
import { PalmFilter } from "./gestures/smoothing";
import { SwipeDetector } from "./gestures/swipe";

/** Per-session state, shared by the live camera and rehearsal/recording replay. */
export function createInterpreter(emit: (event: InputEvent) => void) {
  const swipe = new SwipeDetector();
  const aim = new LaneAim();
  const fist = new FistTrigger();
  const filters = { runner: new PalmFilter(), saboteur: new PalmFilter() };
  const cards = ["Pointing_Up", "Victory", "Thumb_Up"].map((pose) => new PoseTrigger(pose, 180));
  return (f: HandFrame) => {
    const p = filters[f.player].push(f.t, f.landmarks?.[9] ?? null);
    if (f.player === "runner") {
      const direction = swipe.push(f.t, p);
      // Down is recognized in the lab; the shared game contract has no duck action yet.
      if (direction && direction !== "down")
        emit({ player: "runner", action: direction === "up" ? "jump" : direction });
      return direction;
    }
    const lane = aim.push(p?.x ?? null);
    if (lane !== null) emit({ player: "saboteur", action: "aim", lane });
    const gesture = p ? f.gesture : null;
    cards.forEach((card, slot) => {
      if (card.push(f.t, gesture)) emit({ player: "saboteur", action: "select", slot });
    });
    if (fist.push(f.t, gesture)) emit({ player: "saboteur", action: "fire" });
    return null;
  };
}
