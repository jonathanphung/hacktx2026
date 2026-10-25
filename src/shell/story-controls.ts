import type { HandFrame } from "../shared/vision";
import { onMenuMotion } from "./menu-motion";

/** Fresh baseline and grace period stop the gesture that entered a scene from skipping it. */
export function onStoryAdvance(advance: () => void, graceMs = 900): () => void {
  let active = true;
  let off = () => {};
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    timer = setTimeout(() => {
      if (!active) return;
      off = onMenuMotion(() => {
        off();
        if (!active) return;
        advance();
        if (active) arm();
      });
    }, graceMs);
  };
  arm();
  return () => {
    active = false;
    clearTimeout(timer);
    off();
  };
}
function openPalm(frame: HandFrame): boolean {
  if (!frame.landmarks || frame.landmarks.length < 21 || frame.gesture === "Closed_Fist")
    return false;
  if (frame.gesture === "Open_Palm") return true;
  const points = frame.landmarks;
  const wrist = points[0];
  return [
    [5, 8],
    [9, 12],
    [13, 16],
    [17, 20],
  ].every(([base, tip]) => {
    const span = Math.hypot(points[base].x - wrist.x, points[base].y - wrist.y);
    return span > 1e-6 && Math.hypot(points[tip].x - wrist.x, points[tip].y - wrist.y) / span > 1.5;
  });
}
/** Shell-only hold; per-player timers cannot be combined and tracking gaps reset progress. */
export class StoryPalmHold {
  private hands = new Map<string, { since: number; last: number }>();
  private done = false;
  constructor(private holdMs = 1000) {}
  push(frame: HandFrame): { progress: number; complete: boolean } {
    if (this.done || !Number.isFinite(frame.t))
      return { progress: this.done ? 1 : 0, complete: false };
    for (const [player, state] of this.hands)
      if (frame.t - state.last > 180) this.hands.delete(player);
    if (!openPalm(frame)) this.hands.delete(frame.player);
    else {
      const last = this.hands.get(frame.player);
      this.hands.set(frame.player, {
        since: last && frame.t > last.last ? last.since : frame.t,
        last: frame.t,
      });
    }
    const progress = Math.min(
      1,
      Math.max(0, ...[...this.hands.values()].map((h) => (h.last - h.since) / this.holdMs)),
    );
    if (progress === 1) this.done = true;
    return { progress, complete: this.done };
  }
}
