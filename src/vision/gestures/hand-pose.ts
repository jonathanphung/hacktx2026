import type { Point } from "../../shared/types";

export type LandmarkPose = "Closed_Fist" | "Open_Palm";

/** [MCP, tip] landmark indices for index, middle, ring and pinky; 0 is the wrist. */
const FINGERS = [
  [5, 8],
  [9, 12],
  [13, 16],
  [17, 20],
] as const;
/** Fingertip-to-wrist over knuckle-to-wrist: ~2 for a straight finger, <1 once curled in. */
const CURLED = 1.05;
const EXTENDED = 1.5;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Fist / open palm straight from landmarks, so a dropped or low-confidence classifier frame
 * doesn't restart the hold timer. The thumb is ignored (a fist with the thumb out is still a
 * fist), and anything in between is null. Scale-invariant: uses ratios of distances.
 */
export function poseFromLandmarks(landmarks: Point[] | null): LandmarkPose | null {
  if (!landmarks || landmarks.length < 21) return null;
  let curled = 0;
  let extended = 0;
  for (const [mcp, tip] of FINGERS) {
    const base = dist(landmarks[mcp], landmarks[0]);
    if (!(base > 1e-6)) return null;
    const ratio = dist(landmarks[tip], landmarks[0]) / base;
    if (ratio < CURLED) curled++;
    else if (ratio > EXTENDED) extended++;
  }
  if (curled === FINGERS.length) return "Closed_Fist";
  if (extended === FINGERS.length) return "Open_Palm";
  return null;
}

/** The classifier wins when it is sure about fist/palm; landmarks fill its gaps. */
export function effectivePose(gesture: string | null, landmarks: Point[] | null): string | null {
  if (gesture === "Closed_Fist" || gesture === "Open_Palm") return gesture;
  return poseFromLandmarks(landmarks) ?? gesture;
}
