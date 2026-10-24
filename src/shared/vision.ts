import type { PlayerId, Point } from "./types";

/** One tracked frame for one player. Coordinates are relative to that player's half. */
export interface HandFrame {
  player: PlayerId;
  /** ms, performance.now() clock. */
  t: number;
  /** 21 MediaPipe hand landmarks, or null when no hand is visible. Index 0 = wrist. */
  landmarks: Point[] | null;
  /** Static hand shape from the gesture model (e.g. "Closed_Fist"), when that player uses it. */
  gesture: string | null;
}

/** What the vision lane exposes to the rest of the app. */
export interface VisionHandle {
  /** Live, mirrored crop of each player's half — the shell shows these in the corners. */
  previews: Record<PlayerId, HTMLCanvasElement>;
  /** Subscribe to tracked frames (debug overlays, calibration). Returns unsubscribe. */
  onFrame(fn: (frame: HandFrame) => void): () => void;
  stop(): void;
}
