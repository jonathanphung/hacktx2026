import {
  FilesetResolver,
  GestureRecognizer,
  HandLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import type { Point } from "../shared/types";

const base = import.meta.env.BASE_URL;

export interface TrackResult {
  landmarks: Point[] | null;
  gesture: string | null;
}

/** One tracker per player half. Separate instances: each tracks its own hand frame-to-frame. */
export interface Tracker {
  detect(image: HTMLCanvasElement, t: number): TrackResult;
  close(): void;
}

/** Looser than the 0.5 defaults so a fast, blurred hand is kept instead of re-detected. */
const LOOSE_TRACKING = {
  minHandDetectionConfidence: 0.35,
  minHandPresenceConfidence: 0.35,
  minTrackingConfidence: 0.35,
};

const toPoints = (lm: NormalizedLandmark[] | undefined) =>
  lm ? lm.map(({ x, y }) => ({ x, y })) : null;

/** Try the GPU first; some machines/browsers only support CPU. */
async function withDelegate<T>(create: (delegate: "GPU" | "CPU") => Promise<T>): Promise<T> {
  try {
    return await create("GPU");
  } catch (err) {
    console.warn("[vision] GPU delegate failed, falling back to CPU", err);
    return create("CPU");
  }
}

let fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | undefined;
async function getFileset() {
  return (fileset ??= await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`));
}

/** Landmarks only — enough for motion gestures (swipes). Cheaper than the gesture model. */
export async function createHandTracker(): Promise<Tracker> {
  const files = await getFileset();
  const model = await withDelegate((delegate) =>
    HandLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${base}models/hand_landmarker.task`, delegate },
      runningMode: "VIDEO",
      numHands: 1,
      ...LOOSE_TRACKING,
    }),
  );
  return {
    close: () => model.close(),
    detect(image, t) {
      const r = model.detectForVideo(image, t);
      return { landmarks: toPoints(r.landmarks[0]), gesture: null };
    },
  };
}

/** Landmarks plus a static hand shape (Closed_Fist, Open_Palm, Victory, ...). */
export async function createGestureTracker(): Promise<Tracker> {
  const files = await getFileset();
  const model = await withDelegate((delegate) =>
    GestureRecognizer.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${base}models/gesture_recognizer.task`, delegate },
      runningMode: "VIDEO",
      numHands: 1,
      ...LOOSE_TRACKING,
    }),
  );
  return {
    close: () => model.close(),
    detect(image, t) {
      const r = model.recognizeForVideo(image, t);
      return {
        landmarks: toPoints(r.landmarks[0]),
        gesture: (r.gestures[0]?.[0]?.score ?? 0) >= 0.7 ? r.gestures[0][0].categoryName : null,
      };
    },
  };
}
