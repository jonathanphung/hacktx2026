import runtimeSource from "@mediapipe/tasks-vision/vision_bundle.js?raw";
import workerUrl from "./inference.worker.js?url&no-inline";
import type { PlayerId } from "../shared/types";
import { createGestureTracker, createHandTracker, type TrackResult } from "./trackers";

export interface TimedResult extends TrackResult {
  inferenceMs: number;
}
export interface AsyncTracker {
  backend: string;
  detect(image: HTMLCanvasElement, t: number): Promise<TimedResult>;
  close(): void;
}

/** One outstanding request: bounded memory, no queue of increasingly stale video frames. */
export async function createWorkerTracker(
  player: PlayerId,
  signal?: AbortSignal,
): Promise<AsyncTracker> {
  signal?.throwIfAborted();
  const worker = new Worker(new URL(workerUrl, location.href));
  let closed = false;
  let sequence = 0;
  let rejectStartup: ((error: Error) => void) | null = null;
  let pending: {
    id: number;
    resolve: (value: TimedResult) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  const close = () => {
    if (closed) return;
    closed = true;
    signal?.removeEventListener("abort", close);
    rejectStartup?.(new Error("Tracker stopped"));
    rejectStartup = null;
    worker.terminate();
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Tracker stopped"));
      pending = null;
    }
  };
  signal?.addEventListener("abort", close, { once: true });
  try {
    const delegate = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Vision worker initialization timed out")),
        20000,
      );
      rejectStartup = (error) => {
        clearTimeout(timer);
        reject(error);
      };
      worker.onerror = (e) => {
        clearTimeout(timer);
        reject(new Error(e.message || "Vision worker failed"));
      };
      worker.onmessage = ({ data }) => {
        clearTimeout(timer);
        if (data.type === "ready") resolve(data.delegate);
        else reject(new Error(data.message || "Invalid worker initialization"));
      };
      const absolute = (path: string) => new URL(path, document.baseURI).href;
      worker.postMessage({
        type: "init",
        player,
        runtimeSource,
        wasmUrl: absolute(`${import.meta.env.BASE_URL}mediapipe/wasm`),
        modelUrl: absolute(
          `${import.meta.env.BASE_URL}models/${player === "runner" ? "hand_landmarker" : "gesture_recognizer"}.task`,
        ),
      });
    });
    rejectStartup = null;
    const fail = (error: Error) => {
      if (pending) {
        clearTimeout(pending.timer);
        pending.reject(error);
        pending = null;
      }
      close();
    };
    worker.onerror = (e) => fail(new Error(e.message || "Vision worker failed"));
    worker.onmessage = ({ data }) => {
      if (!pending || data.id !== pending.id) return;
      const request = pending;
      pending = null;
      clearTimeout(request.timer);
      if (data.type === "result") request.resolve(data as TimedResult);
      else {
        request.reject(new Error(data.message || "Vision inference failed"));
        close();
      }
    };
    let busy = false;
    let warmedUp = false;
    return {
      backend: `worker / ${delegate}`,
      async detect(image, t) {
        if (closed || busy)
          throw new Error(closed ? "Tracker stopped" : "Inference already in progress");
        busy = true;
        try {
          const bitmap = await createImageBitmap(image);
          if (closed) {
            bitmap.close();
            throw new Error("Tracker stopped");
          }
          const result = await new Promise<TimedResult>((resolve, reject) => {
            const id = ++sequence;
            const timer = setTimeout(
              () => fail(new Error("Vision inference timed out")),
              warmedUp ? 5000 : 20000,
            );
            pending = { id, resolve, reject, timer };
            try {
              worker.postMessage({ type: "detect", id, image: bitmap, t }, [bitmap]);
            } catch (error) {
              bitmap.close();
              fail(error instanceof Error ? error : new Error(String(error)));
            }
          });
          warmedUp = true;
          return result;
        } finally {
          busy = false;
        }
      },
      close,
    };
  } catch (error) {
    close();
    throw error;
  }
}

export async function createAsyncTracker(
  player: PlayerId,
  signal?: AbortSignal,
): Promise<AsyncTracker> {
  try {
    return await createWorkerTracker(player, signal);
  } catch (error) {
    signal?.throwIfAborted();
    console.warn(`[vision] ${player}: worker unavailable; using main-thread fallback`, error);
    const model = await (player === "runner" ? createHandTracker() : createGestureTracker());
    return {
      backend: "main-thread fallback",
      async detect(image, t) {
        const start = performance.now();
        const result = model.detect(image, t);
        return { ...result, inferenceMs: performance.now() - start };
      },
      close: () => model.close(),
    };
  }
}
