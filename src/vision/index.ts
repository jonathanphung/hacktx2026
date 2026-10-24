import { Emitter } from "../shared/emitter";
import { inputBus } from "../shared/input";
import { PLAYER_SIDE, type PlayerId } from "../shared/types";
import type { HandFrame, VisionHandle } from "../shared/vision";
import { LaneAim } from "./gestures/aim";
import { FistTrigger } from "./gestures/fire";
import { SwipeDetector } from "./gestures/swipe";
import { createGestureTracker, createHandTracker, type Tracker } from "./trackers";

/** Landmark used as "where the hand is": 9 = base of the middle finger, steadier than the wrist. */
const PALM = 9;

async function openCamera(): Promise<HTMLVideoElement> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
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

/** Turns a player's tracked frames into game input events. */
function makeInterpreter(player: PlayerId): (frame: HandFrame) => void {
  const palm = (f: HandFrame) => f.landmarks?.[PALM] ?? null;
  if (player === "runner") {
    const swipe = new SwipeDetector();
    return (f) => {
      const s = swipe.push(f.t, palm(f));
      if (s) inputBus.emit("input", { player, action: s === "up" ? "jump" : s, source: "vision" });
    };
  }
  const aim = new LaneAim();
  const fist = new FistTrigger();
  return (f) => {
    const lane = aim.push(palm(f)?.x ?? null);
    if (lane !== null) inputBus.emit("input", { player, action: "aim", lane, source: "vision" });
    if (fist.push(f.gesture)) inputBus.emit("input", { player, action: "fire", source: "vision" });
  };
}

/** Starts the webcam and both trackers. Rejects if the camera is unavailable or denied. */
export async function startVision(): Promise<VisionHandle> {
  const video = await openCamera();
  const trackers: Record<PlayerId, Tracker> = {
    runner: await createHandTracker(),
    saboteur: await createGestureTracker(),
  };
  const previews: Record<PlayerId, HTMLCanvasElement> = {
    runner: document.createElement("canvas"),
    saboteur: document.createElement("canvas"),
  };
  const interpret = { runner: makeInterpreter("runner"), saboteur: makeInterpreter("saboteur") };
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
        interpret[player](frame);
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
      running = false;
      (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
    },
  };
}
