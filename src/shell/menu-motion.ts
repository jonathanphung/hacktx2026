import type { HandFrame, VisionHandle } from "../shared/vision";

/** Menu-only movement detection. Never emits game input or modifies either player's controls. */
export class MenuMotion {
  private samples = new Map<string, HandFrame>();
  private fired = false;
  push(frame: HandFrame): boolean {
    if (this.fired || !Number.isFinite(frame.t)) return false;
    const points = frame.landmarks;
    const old = this.samples.get(frame.player);
    if (
      !points ||
      points.length < 21 ||
      points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
    ) {
      this.samples.delete(frame.player);
      return false;
    }
    if (!old?.landmarks || frame.t <= old.t || frame.t - old.t > 650) {
      this.samples.set(frame.player, frame);
      return false;
    }
    // Finger waves, horizontal/vertical motion and depth-induced hand-size changes all count.
    // The first observation alone and sub-threshold tracking jitter never start a screen.
    const moved = [0, 4, 8, 9, 12, 16, 20].some(
      (i) =>
        Math.hypot(points[i].x - old.landmarks![i].x, points[i].y - old.landmarks![i].y) >= 0.06,
    );
    if (moved) this.fired = true;
    return moved;
  }
}

const listeners = new Set<{ motion: MenuMotion; start: () => void }>();
const frameListeners = new Set<(frame: HandFrame) => void>();
export function onStoryFrame(fn: (frame: HandFrame) => void): () => void {
  frameListeners.add(fn);
  return () => {
    frameListeners.delete(fn);
  };
}
let stopVision: (() => void) | undefined;
export function installMenuMotion(vision: Pick<VisionHandle, "onFrame">): () => void {
  stopVision?.();
  const stop = vision.onFrame((frame) => {
    for (const fn of [...frameListeners]) fn(frame);
    for (const entry of [...listeners]) if (entry.motion.push(frame)) entry.start();
  });
  stopVision = stop;
  return stop;
}
/** Each title/replay screen gets a fresh baseline; gameplay has no subscriber. */
export function onMenuMotion(start: () => void): () => void {
  const entry = { motion: new MenuMotion(), start };
  listeners.add(entry);
  return () => {
    listeners.delete(entry);
  };
}
