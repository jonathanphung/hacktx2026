import { inputBus, type InputEvent } from "../shared/input";
import type { PlayerId } from "../shared/types";
import type { HandFrame, VisionHandle } from "../shared/vision";
import { VisionFeedback } from "./feedback";
import { CircleDetector } from "./gestures/circle";
import { createInterpreter } from "./interpreter";
import { startVision } from "./index";
import {
  AimCalibration,
  DEFAULT_SETTINGS,
  getVisionSettings,
  saveVisionSettings,
} from "./calibration";
import { benchmarkVision } from "./benchmark";
import { VisionPerformance } from "./performance";
import { parseRecording, rehearsalFrames } from "./rehearsal";

const halves = document.getElementById("halves")!;
const log = document.getElementById("log")!;
const status = document.getElementById("status")!;
const metrics = document.getElementById("metrics")!;
let performanceStats = new VisionPerformance();
let calibration: AimCalibration | null = null;
const calibrationStatus = document.getElementById("calibration-status")!;
const sensitivity = document.getElementById("sensitivity") as HTMLSelectElement;
function settingsText() {
  const s = getVisionSettings();
  sensitivity.value = String(s.swipeDistance);
  calibrationStatus.textContent = `Aim range ${(s.aim.minX * 100).toFixed(0)}–${(s.aim.maxX * 100).toFixed(0)}% of the right half · runner stroke ${(s.swipeDistance * 100).toFixed(0)}%. Settings apply to live controls and are saved in this browser.`;
}
sensitivity.onchange = () => {
  const persisted = saveVisionSettings({
    ...getVisionSettings(),
    swipeDistance: Number(sensitivity.value),
  });
  settingsText();
  if (!persisted) calibrationStatus.textContent += " Storage unavailable: this session only.";
};
document.getElementById("reset-settings")!.onclick = () => {
  calibration = null;
  saveVisionSettings(DEFAULT_SETTINGS);
  settingsText();
};
document.getElementById("calibrate")!.onclick = () => {
  if (!vision) {
    calibrationStatus.textContent =
      "Start the live camera first. Calibration does not use rehearsal or replay data.";
    return;
  }
  calibration = new AimCalibration(performance.now());
  calibrationStatus.textContent =
    "Sweep an open palm comfortably left and right across the RIGHT half for five seconds. Pause briefly at each end.";
};
settingsText();
const controls = new Map<string, HTMLButtonElement>();
for (const id of ["start", "stop", "rehearse", "record", "download", "benchmark"])
  controls.set(id, document.getElementById(id) as HTMLButtonElement);
const overlays = {} as Record<
  PlayerId,
  { source: HTMLCanvasElement; canvas: HTMLCanvasElement; label: HTMLElement }
>;
let vision: VisionHandle | null = null;
let startup: AbortController | null = null;
let unsubscribe: (() => void) | null = null;
let generation = 0;
let replayId = 0;
let recording = false;
let recorded: HandFrame[] = [];
let circle = new CircleDetector();
let lastFrame = 0;
let fps = 0;
let motion = "waiting";
let mode = "idle";
let replayTime = 0;
let feedback = new VisionFeedback();
const signalNodes = {
  runner: document.getElementById("signal-runner")!,
  saboteur: document.getElementById("signal-saboteur")!,
};
function feedbackTime() {
  return mode === "LIVE CAMERA" ? performance.now() : replayTime;
}
function paintSignals() {
  for (const player of ["runner", "saboteur"] as const) {
    const view = feedback.view(player, feedbackTime());
    if (mode === "idle") {
      signalNodes[player].querySelector("strong")!.textContent = "Camera off";
      signalNodes[player].querySelector("span")!.textContent =
        "Start the camera or run rehearsal to see inferred controls.";
      continue;
    }
    const node = signalNodes[player];
    node.querySelector("strong")!.textContent = view.action ? `SENT: ${view.action}` : view.status;
    node.querySelector("span")!.textContent =
      `${view.status} · ${view.pose ? `Pose: ${view.pose} · ` : ""}${view.latency.toFixed(0)} ms capture → result`;
  }
}

function line(text: string) {
  const row = document.createElement("div");
  row.textContent = `${new Date().toLocaleTimeString()}  ${text}`;
  log.prepend(row);
  while (log.children.length > 100) log.lastElementChild?.remove();
}
function event(e: InputEvent) {
  feedback.input(e, feedbackTime());
  paintSignals();
  line(JSON.stringify(e));
}
inputBus.on("input", event);
let interpret = createInterpreter(event);
let diagnose = createInterpreter(() => {});

function mount(sources?: Record<PlayerId, HTMLCanvasElement>) {
  halves.replaceChildren();
  feedback = new VisionFeedback();
  paintSignals();
  circle = new CircleDetector();
  diagnose = createInterpreter(() => {});
  lastFrame = 0;
  fps = 0;
  motion = "waiting";
  for (const player of ["runner", "saboteur"] as const) {
    const wrap = document.createElement("section");
    wrap.className = `half ${player}`;
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = player === "runner" ? "LEFT · RUNNER" : "RIGHT · SABOTEUR";
    const source = sources?.[player] ?? document.createElement("canvas");
    if (!sources) {
      source.width = 480;
      source.height = 540;
    }
    const overlay = document.createElement("canvas");
    overlay.className = "overlay";
    const stage = document.createElement("div");
    stage.className = "stage";
    stage.append(source, overlay);
    wrap.append(label, stage);
    halves.append(wrap);
    overlays[player] = { source, canvas: overlay, label };
  }
}
function render(f: HandFrame) {
  feedback.frame(f, feedbackTime());
  paintSignals();
  if (calibration && f.player === "saboteur") {
    const capture = calibration;
    if (capture.push(f)) {
      calibration = null;
      try {
        const persisted = saveVisionSettings({ ...getVisionSettings(), aim: capture.result() });
        settingsText();
        if (!persisted) calibrationStatus.textContent += " Storage unavailable: this session only.";
        line(
          "Aim calibration applied. Both the live interpreter and overlay now use the captured range.",
        );
      } catch (error) {
        calibrationStatus.textContent = `Calibration unchanged: ${error}`;
      }
    } else
      calibrationStatus.textContent = `Sweep the RIGHT palm left and right · ${Math.max(0, (capture.durationMs - (f.t - capture.start)) / 1000).toFixed(1)} seconds remaining`;
  }
  const direction = diagnose(f);
  if (direction) {
    motion = direction;
    line(`Motion: ${direction}${direction === "down" ? " (lab only)" : ""}`);
  }
  if (f.player === "runner") {
    if (lastFrame && f.t > lastFrame)
      fps = fps ? fps * 0.8 + (1000 / (f.t - lastFrame)) * 0.2 : 1000 / (f.t - lastFrame);
    lastFrame = f.t;
    const result = circle.push(f.t, f.landmarks?.[9] ?? null);
    if (result) {
      motion = `${result} circle`;
      line(`LAB ONLY: ${motion}`);
    }
  }
  const { source, canvas, label } = overlays[f.player];
  if (canvas.width !== source.width || canvas.height !== source.height) {
    canvas.width = source.width;
    canvas.height = source.height;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#ffffff40";
  const range = f.player === "saboteur" ? getVisionSettings().aim : DEFAULT_SETTINGS.aim;
  for (const fraction of [1 / 3, 2 / 3]) {
    const x = range.minX + (range.maxX - range.minX) * fraction;
    ctx.beginPath();
    ctx.moveTo(x * canvas.width, 0);
    ctx.lineTo(x * canvas.width, canvas.height);
    ctx.stroke();
  }
  ctx.fillStyle = f.player === "runner" ? "#61edc4" : "#c5a1ff";
  for (const p of f.landmarks ?? []) {
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  label.textContent = `${f.player === "runner" ? "LEFT · RUNNER" : "RIGHT · SABOTEUR"} · ${f.landmarks ? "tracking" : "no hand"} · ${f.gesture ?? (f.player === "runner" ? motion : "—")}`;
  status.textContent = `${mode} · ${fps.toFixed(0)} tracked fps · ${recording ? `Recording ${recorded.length} frames` : "Ready"}`;
  if (recording) {
    recorded.push(structuredClone(f));
    if (recorded.length >= 18000) {
      recording = false;
      line("Recording limit reached; download your landmark data.");
    }
  }
}
function stop() {
  generation++;
  if (calibration) {
    calibration = null;
    calibrationStatus.textContent = "Calibration cancelled; previous settings kept.";
  }
  startup?.abort();
  startup = null;
  cancelAnimationFrame(replayId);
  unsubscribe?.();
  unsubscribe = null;
  vision?.stop();
  vision = null;
  recording = false;
  controls.get("record")!.textContent = "Record landmarks";
  mode = "idle";
  feedback = new VisionFeedback();
  paintSignals();
  for (const { source, canvas, label } of Object.values(overlays)) {
    source.getContext("2d")?.clearRect(0, 0, source.width, source.height);
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    label.textContent = "Camera stopped";
  }
  status.textContent = "Stopped. Camera released.";
}
controls.get("stop")!.onclick = stop;
controls.get("start")!.onclick = async () => {
  stop();
  const current = generation;
  startup = new AbortController();
  mode = "loading";
  paintSignals();
  status.textContent = "Waiting for camera permission…";
  try {
    performanceStats = new VisionPerformance();
    const handle = await startVision(
      startup.signal,
      (timing) => {
        performanceStats.push(timing);
        const s = performanceStats.summary();
        metrics.textContent = `LIVE · ${s.fps.toFixed(1)} processed fps · runner capture → control p50/p95 ${s.p50.toFixed(0)}/${s.p95.toFixed(0)} ms · runner/saboteur model ${s.runnerMs.toFixed(0)}/${s.saboteurMs.toFixed(0)} ms · hands visible ${(s.runnerCoverage * 100).toFixed(0)}% / ${(s.saboteurCoverage * 100).toFixed(0)}% · ${timing.backends.runner} + ${timing.backends.saboteur}`;
      },
      (message) => {
        if (current === generation) status.textContent = message;
      },
    );
    if (current !== generation) {
      handle.stop();
      return;
    }
    vision = handle;
    mode = "LIVE CAMERA";
    mount(handle.previews);
    unsubscribe = handle.onFrame(render);
    line("Live tracking started. Aim with an open palm, close a fist to cast.");
  } catch (error) {
    if (current === generation)
      status.textContent = `Camera unavailable: ${error}. You can still run rehearsal.`;
  }
};
function replay(frames: HandFrame[], name: string) {
  stop();
  mount();
  mode = name;
  metrics.textContent =
    "Synthetic/recorded replay: FPS is playback cadence, not model performance.";
  interpret = createInterpreter(event);
  const start = performance.now();
  const offset = frames[0].t;
  let index = 0;
  const tick = () => {
    const elapsed = performance.now() - start;
    while (index < frames.length && frames[index].t - offset <= elapsed) {
      const f = frames[index++];
      replayTime = f.t;
      interpret(f);
      render(f);
    }
    if (index < frames.length) replayId = requestAnimationFrame(tick);
    else {
      status.textContent += " · Playback complete";
      line("Playback complete.");
    }
  };
  replayId = requestAnimationFrame(tick);
}
controls.get("rehearse")!.onclick = () =>
  replay(rehearsalFrames(), "SYNTHETIC REHEARSAL — no camera");
controls.get("record")!.onclick = () => {
  if (!vision) {
    line("Start the live camera before recording.");
    return;
  }
  recording = !recording;
  if (recording) recorded = [];
  controls.get("record")!.textContent = recording ? "Finish recording" : "Record landmarks";
};
controls.get("download")!.onclick = () => {
  if (!recorded.length) {
    line("No landmark recording yet.");
    return;
  }
  const url = URL.createObjectURL(
    new Blob([JSON.stringify([...recorded].sort((a, b) => a.t - b.t))], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "hacktx-landmarks.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
(document.getElementById("upload") as HTMLInputElement).onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    if (file.size > 10_000_000) throw new Error("Recording must be smaller than 10 MB.");
    replay(parseRecording(await file.text()), "RECORDED LANDMARK REPLAY");
  } catch (error) {
    line(`Cannot replay: ${error}`);
  }
};
const feedbackTimer = window.setInterval(() => {
  if (mode === "LIVE CAMERA") paintSignals();
}, 100);
window.addEventListener("pagehide", () => {
  clearInterval(feedbackTimer);
  stop();
});
mount();

controls.get("benchmark")!.onclick = async () => {
  stop();
  const current = generation;
  startup = new AbortController();
  const signal = startup.signal;
  status.textContent = "Benchmark: real local models, empty images, no camera.";
  try {
    const result = await benchmarkVision(signal, (text) => {
      if (current === generation) metrics.textContent = text;
    });
    if (current !== generation) return;
    status.textContent = "Benchmark complete · 60 frames after warm-up · NO HANDS / no camera";
    metrics.textContent = `Round trip p50/p95: ${result.p50.toFixed(1)}/${result.p95.toFixed(1)} ms · throughput ${result.fps.toFixed(1)} fps · model medians ${result.runnerMs.toFixed(1)}/${result.saboteurMs.toFixed(1)} ms · longest UI frame gap ${result.maxUiGap.toFixed(1)} ms (${result.uiStalls} gaps >50 ms; startup max ${result.startupUiGap.toFixed(1)} ms) · ${result.backends?.runner} + ${result.backends?.saboteur}`;
    line(`No-hand model benchmark: ${JSON.stringify(result)}`);
  } catch (error) {
    if (current === generation) metrics.textContent = `Benchmark failed: ${error}`;
  }
};
