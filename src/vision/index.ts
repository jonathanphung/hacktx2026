import { Emitter } from "../shared/emitter";
import { inputBus } from "../shared/input";
import { PLAYER_SIDE, type PlayerId } from "../shared/types";
import type { HandFrame, VisionHandle } from "../shared/vision";
import { createInterpreter } from "./interpreter";
import { createAsyncTracker, type AsyncTracker } from "./async-tracker";
import type { VisionTiming } from "./performance";

async function openCamera(signal?: AbortSignal): Promise<HTMLVideoElement> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
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
function drawHalf(video: HTMLVideoElement, canvas: HTMLCanvasElement, player: PlayerId) {
  const w = video.videoWidth / 2;
  const h = video.videoHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(-1, 0, 0, 1, w, 0);
  ctx.drawImage(video, PLAYER_SIDE[player] === "left" ? w : 0, 0, w, h, 0, 0, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** Starts the webcam and both trackers. Rejects if the camera is unavailable or denied. */
export async function startVision(
  signal?: AbortSignal,
  onTiming?: (timing: VisionTiming) => void,
): Promise<VisionHandle> {
  signal?.throwIfAborted();
  const video = await openCamera(signal);
  const trackers = {} as Record<PlayerId, AsyncTracker>;
  try {
    signal?.throwIfAborted();
    trackers.runner = await createAsyncTracker("runner", signal);
    signal?.throwIfAborted();
    trackers.saboteur = await createAsyncTracker("saboteur", signal);
    signal?.throwIfAborted();
  } catch (error) {
    trackers.runner?.close();
    trackers.saboteur?.close();
    (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
    throw error;
  }
  const previews: Record<PlayerId, HTMLCanvasElement> = {
    runner: document.createElement("canvas"),
    saboteur: document.createElement("canvas"),
  };
  const interpret = createInterpreter((event) =>
    inputBus.emit("input", { ...event, source: "vision" }),
  );
  const frames = new Emitter<{ frame: HandFrame }>();

  let running = true;
  let lastVideoTime = -1;
  let raf = 0;
  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    signal?.removeEventListener("abort", stop);
    trackers.runner.close();
    trackers.saboteur.close();
    (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
  };
  signal?.addEventListener("abort", stop, { once: true });
  const tick = async () => {
    if (!running) return;
    try {
      if (video.currentTime !== lastVideoTime && video.videoWidth > 0) {
        lastVideoTime = video.currentTime;
        const t = performance.now();
        for (const player of ["runner", "saboteur"] as const)
          drawHalf(video, previews[player], player);
        // Capture both halves together; never enqueue a second frame until both results arrive.
        const [runner, saboteur] = await Promise.all([
          trackers.runner.detect(previews.runner, t),
          trackers.saboteur.detect(previews.saboteur, t),
        ]);
        if (!running) return;
        for (const [player, result] of [
          ["runner", runner],
          ["saboteur", saboteur],
        ] as const) {
          const frame: HandFrame = {
            player,
            t,
            landmarks: result.landmarks,
            gesture: result.gesture,
          };
          interpret(frame);
          frames.emit("frame", frame);
        }
        onTiming?.({
          t,
          roundTripMs: performance.now() - t,
          runnerMs: runner.inferenceMs,
          saboteurMs: saboteur.inferenceMs,
          runnerHand: !!runner.landmarks,
          saboteurHand: !!saboteur.landmarks,
          backends: { runner: trackers.runner.backend, saboteur: trackers.saboteur.backend },
        });
      }
    } catch (error) {
      if (running) {
        console.error("[vision] tracking stopped", error);
        stop();
      }
      return;
    }
    if (running) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    previews,
    onFrame: (fn) => frames.on("frame", fn),
    stop,
  };
}
