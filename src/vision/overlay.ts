import type { PlayerId } from "../shared/types";
import { getVisionSettings } from "./calibration";
import type { VisionFeedback } from "./feedback";

const EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];
export function drawFeedback(
  canvas: HTMLCanvasElement,
  player: PlayerId,
  feedback: VisionFeedback,
  now: number,
) {
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  const view = feedback.view(player, now);
  const color = player === "runner" ? "#61edc4" : "#c5a1ff";
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, w / 150);
  {
    // Runner guides are visual references; swipe controls remain relative motions.
    const range = player === "saboteur" ? getVisionSettings().aim : { minX: 0, maxX: 1 };
    ctx.globalAlpha = 0.5;
    for (const fraction of [1 / 3, 2 / 3]) {
      const x = (range.minX + (range.maxX - range.minX) * fraction) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const points = view.landmarks;
  if (points) {
    for (const [a, b] of EDGES) {
      if (!points[a] || !points[b]) continue;
      ctx.beginPath();
      ctx.moveTo(points[a].x * w, points[a].y * h);
      ctx.lineTo(points[b].x * w, points[b].y * h);
      ctx.stroke();
    }
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, Math.max(3, w / 100), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Keep the role header; leave the lower camera view free of text and panels.
  const font = Math.max(14, w / 14);
  const pad = font / 2;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#080d15cc";
  ctx.fillRect(0, 0, w, font * 1.5);
  ctx.font = `bold ${font}px system-ui`;
  ctx.fillStyle = color;
  ctx.fillText(
    player === "runner" ? "LEFT · RUNNER" : "RIGHT · SABOTEUR",
    pad,
    font / 4,
    w - 2 * pad,
  );
  ctx.restore();
}
