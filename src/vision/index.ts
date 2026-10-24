import { Emitter } from "../shared/emitter";
import { inputBus } from "../shared/input";
import { PLAYER_SIDE, type PlayerId } from "../shared/types";
import type { HandFrame, VisionHandle } from "../shared/vision";
import { createInterpreter } from "./interpreter";
import { createAsyncTracker, type AsyncTracker } from "./async-tracker";
import { FrameTask } from "./frame-task";
import { VisionFeedback } from "./feedback";
import { drawFeedback } from "./overlay";
import type { TimedResult } from "./async-tracker";
import type { VisionTiming } from "./performance";

async function openCamera(signal?: AbortSignal): Promise<HTMLVideoElement> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
    audio: false,
  });
  if (signal?.aborted) {
    stream.getTracks().forEach((track) => track.stop());
    signal.throwIfAborted();
  }
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  try {
    await video.play();
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
  return video;
}

/**
 * Draws one player's half of the camera into `canvas`, mirrored so it matches what they see.
 * Mirrored on screen, the LEFT player is in the RIGHT half of the raw camera frame.
 */
function drawHalf(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  player: PlayerId,
  maxWidth = 480,
) {
  const w = video.videoWidth / 2;
  const h = video.videoHeight;
  const cw = Math.min(maxWidth, Math.floor(w));
  const ch = Math.round((h * cw) / w);
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(-1, 0, 0, 1, cw, 0);
  ctx.drawImage(video, PLAYER_SIDE[player] === "left" ? w : 0, 0, w, h, 0, 0, cw, ch);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** Starts the webcam and both trackers. Rejects if the camera is unavailable or denied. */
export async function startVision(
  signal?: AbortSignal,
  onTiming?: (timing: VisionTiming) => void,
  onStatus?: (message: string) => void,
): Promise<VisionHandle> {
  signal?.throwIfAborted();
  onStatus?.("Waiting for camera permission…");
  const video = await openCamera(signal);
  onStatus?.("Camera ready. Loading runner model…");
  const trackers = {} as Record<PlayerId, AsyncTracker>;
  try {
    signal?.throwIfAborted();
    trackers.runner = await createAsyncTracker("runner", signal);
    signal?.throwIfAborted();
    onStatus?.("Runner model ready. Loading saboteur model…");
    trackers.saboteur = await createAsyncTracker("saboteur", signal);
    signal?.throwIfAborted();
  } catch (error) {
    trackers.runner?.close();
    trackers.saboteur?.close();
    (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
    throw error;
  }
  onStatus?.("Models ready. Tracking hands…");
  const previews: Record<PlayerId, HTMLCanvasElement> = {
    runner: document.createElement("canvas"),
    saboteur: document.createElement("canvas"),
  };
  const inputs: Record<PlayerId, HTMLCanvasElement> = {
    runner: document.createElement("canvas"),
    saboteur: document.createElement("canvas"),
  };
  const feedback = new VisionFeedback();
  const interpret = createInterpreter((event) => {
    feedback.input(event, performance.now());
    inputBus.emit("input", { ...event, source: "vision" });
  });
  const frames = new Emitter<{ frame: HandFrame }>();
  const tasks = { runner: new FrameTask<TimedResult>(), saboteur: new FrameTask<TimedResult>() };
  const latest: Partial<Record<PlayerId, { result: TimedResult; age: number }>> = {};
  let running = true;
  let raf = 0;
  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    signal?.removeEventListener("abort", stop);
    for (const player of ["runner", "saboteur"] as const) {
      tasks[player].stop();
      trackers[player].close();
    }
    (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
  };
  signal?.addEventListener("abort", stop, { once: true });
  const tick = () => {
    if (!running) return;
    if (video.videoWidth > 0)
      for (const player of ["runner", "saboteur"] as const) {
        drawHalf(video, previews[player], player);
        drawFeedback(previews[player], player, feedback, performance.now());
        if (!tasks[player].canRun(video.currentTime)) continue;
        // Raw input has its own canvas: overlays can never become model input.
        drawHalf(video, inputs[player], player, 320);
        const t = performance.now();
        tasks[player].run(
          video.currentTime,
          () => trackers[player].detect(inputs[player], t),
          (result) => {
            const now = performance.now();
            const age = now - t;
            // A delayed startup/stalled worker must not replay old movement into the game.
            const frame: HandFrame = {
              player,
              t,
              landmarks: age <= 180 ? result.landmarks : null,
              gesture: age <= 180 ? result.gesture : null,
            };
            feedback.frame(frame, now);
            interpret(frame); // Dispatch immediately; never wait for the other player's model.
            frames.emit("frame", frame);
            latest[player] = { result, age };
            const runner = latest.runner,
              saboteur = latest.saboteur;
            if (player === "runner" && runner && saboteur)
              onTiming?.({
                t,
                roundTripMs: age,
                runnerMs: runner.result.inferenceMs,
                saboteurMs: saboteur.result.inferenceMs,
                runnerHand: !!runner.result.landmarks,
                saboteurHand: !!saboteur.result.landmarks,
                backends: { runner: trackers.runner.backend, saboteur: trackers.saboteur.backend },
              });
          },
          (error) => {
            feedback.fail(player, String(error));
            interpret({ player, t: performance.now(), landmarks: null, gesture: null });
            tasks[player].stop();
            trackers[player].close();
            console.error(`[vision] ${player} tracking stopped`, error);
          },
        );
      }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return { previews, onFrame: (fn) => frames.on("frame", fn), stop };
}
