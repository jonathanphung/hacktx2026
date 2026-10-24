import { Emitter } from "../shared/emitter";
import { inputBus } from "../shared/input";
import { PLAYER_SIDE, type PlayerId } from "../shared/types";
import type { HandFrame, VisionHandle } from "../shared/vision";
import { createInterpreter } from "./interpreter";
import { createGestureTracker, createHandTracker, type Tracker } from "./trackers";

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
export async function startVision(signal?: AbortSignal): Promise<VisionHandle> {
  signal?.throwIfAborted();
  const video = await openCamera(signal);
  const trackers = {} as Record<PlayerId, Tracker>;
  try {
    signal?.throwIfAborted();
    trackers.runner = await createHandTracker();
    signal?.throwIfAborted();
    trackers.saboteur = await createGestureTracker();
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
  const tick = () => {
    if (!running) return;
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const t = performance.now();
      for (const player of ["runner", "saboteur"] as const) {
        drawHalf(video, previews[player], player);
        const { landmarks, gesture } = trackers[player].detect(previews[player], t);
        const frame: HandFrame = { player, t, landmarks, gesture };
        interpret(frame);
        frames.emit("frame", frame);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return {
    previews,
    onFrame: (fn) => frames.on("frame", fn),
    stop() {
      if (!running) return;
      running = false;
      trackers.runner.close();
      trackers.saboteur.close();
      (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
    },
  };
}
