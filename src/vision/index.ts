import { Emitter } from "../shared/emitter";
import { inputBus } from "../shared/input";
import { PLAYER_SIDE, type PlayerId } from "../shared/types";
import type { HandFrame, VisionHandle } from "../shared/vision";
import { saboteurBus } from "../shared/world";
import { createInterpreter } from "./interpreter";
import { createAsyncTracker, type AsyncTracker } from "./async-tracker";
import { watchCameraFrames } from "./camera-clock";
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
  const cameraTrack = (video.srcObject as MediaStream).getTracks()[0];
  const cameraFps = cameraTrack?.getSettings?.().frameRate;
  onStatus?.(
    `Camera ready${cameraFps ? ` (${cameraFps.toFixed(0)} reported fps)` : ""}. Loading runner model…`,
  );
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
  const unlisten = [
    saboteurBus.on("saboteur-status", (s) => feedback.status(s, performance.now())),
    saboteurBus.on("cast-result", (r) => feedback.result(r, performance.now())),
  ];
  const interpret = createInterpreter((event) => {
    feedback.input(event, performance.now());
    inputBus.emit("input", { ...event, source: "vision" });
  });
  const frames = new Emitter<{ frame: HandFrame }>();
  const tasks = { runner: new FrameTask<TimedResult>(), saboteur: new FrameTask<TimedResult>() };
  const latest: Partial<Record<PlayerId, { result: TimedResult; age: number }>> = {};
  let running = true;
  let raf = 0;
  let latestCameraFrame = -1;
  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    unlisten.forEach((off) => off());
    stopWatching?.();
    signal?.removeEventListener("abort", stop);
    for (const player of ["runner", "saboteur"] as const) {
      tasks[player].stop();
      trackers[player].close();
    }
    (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
  };
  signal?.addEventListener("abort", stop, { once: true });
  /** Starts inference for one player on this frame; a no-op if that lane is busy or saw it already. */
  const infer = (player: PlayerId, frameKey: number) => {
    if (!running || video.videoWidth === 0 || !tasks[player].canRun(frameKey)) return;
    // Raw input has its own canvas: overlays can never become model input.
    drawHalf(video, inputs[player], player, 320);
    const t = performance.now();
    tasks[player].run(
      frameKey,
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
            cameraFps,
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
      () => {
        // If a camera frame arrived while inference was busy, use the latest frame now
        // instead of waiting another whole camera interval. This is not a frame queue.
        if (stopWatching && latestCameraFrame >= 0) infer(player, latestCameraFrame);
      },
    );
  };
  // Where supported, inference follows actual camera frames; otherwise poll once per animation frame.
  const stopWatching = watchCameraFrames(video, (frameKey) => {
    latestCameraFrame = frameKey;
    for (const player of ["runner", "saboteur"] as const) infer(player, frameKey);
  });
  const tick = () => {
    if (!running) return;
    if (video.videoWidth > 0)
      for (const player of ["runner", "saboteur"] as const) {
        drawHalf(video, previews[player], player);
        drawFeedback(previews[player], player, feedback, performance.now());
        if (!stopWatching) infer(player, video.currentTime);
      }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return { previews, onFrame: (fn) => frames.on("frame", fn), stop };
}
