// Standalone page (vision.html) for working on gestures without the game.
import { inputBus } from "../shared/input";
import type { PlayerId } from "../shared/types";
import { startVision } from "./index";

const halves = document.getElementById("halves")!;
const log = document.getElementById("log")!;

function line(text: string) {
  const row = document.createElement("div");
  row.textContent = `${new Date().toLocaleTimeString()}  ${text}`;
  log.prepend(row);
}

inputBus.on("input", (e) => line(JSON.stringify(e)));

try {
  const vision = await startVision();
  const overlays = {} as Record<PlayerId, { canvas: HTMLCanvasElement; label: HTMLElement }>;

  for (const player of ["runner", "saboteur"] as const) {
    const wrap = document.createElement("div");
    wrap.className = "half";
    const label = document.createElement("div");
    label.className = "label";
    const overlay = document.createElement("canvas");
    overlay.className = "overlay";
    const stage = document.createElement("div");
    stage.style.position = "relative";
    stage.append(vision.previews[player], overlay);
    wrap.append(label, stage);
    halves.append(wrap);
    overlays[player] = { canvas: overlay, label };
  }

  let last = performance.now();
  let fps = 0;
  vision.onFrame((f) => {
    if (f.player === "runner") {
      fps = fps * 0.9 + (1000 / (f.t - last)) * 0.1;
      last = f.t;
    }
    const { canvas, label } = overlays[f.player];
    const src = vision.previews[f.player];
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0f8";
    for (const p of f.landmarks ?? []) {
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    label.textContent = `${f.player} — ${f.landmarks ? "hand" : "no hand"}${
      f.gesture ? ` — ${f.gesture}` : ""
    } — ${fps.toFixed(0)} fps`;
  });
  line("vision started");
} catch (err) {
  line(`vision failed: ${err}`);
  console.error(err);
}
