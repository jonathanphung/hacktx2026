import type { PlayerId } from "../shared/types";
import type { VisionHandle } from "../shared/vision";

/** Reuse vision previews in a compact dock, leaving the game as the primary view. */
export function mountWebcamCorners(vision: Pick<VisionHandle, "previews">): void {
  for (const player of ["runner", "saboteur"] as PlayerId[]) {
    document.getElementById(`cam-${player}`)?.replaceChildren(vision.previews[player]);
  }
  const dock = document.getElementById("facecam");
  const body = document.getElementById("facecam-body");
  const toggle = document.getElementById("facecam-toggle");
  const size = document.getElementById("facecam-size");
  if (!dock || !body || !toggle || !size) return;
  dock.hidden = false;
  for (const control of [toggle, size]) {
    control.onkeydown = (event) => {
      // Activating dock buttons with a keyboard must not also start a run or fire an attack.
      if (event.key === "Enter" || event.key === " ") event.stopPropagation();
    };
  }
  toggle.onclick = () => {
    body.hidden = !body.hidden;
    toggle.setAttribute("aria-expanded", String(!body.hidden));
    const label = body.hidden ? "Show player cameras" : "Collapse player cameras";
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
    toggle.textContent = body.hidden ? "+" : "−";
  };
  size.onclick = () => {
    const expanded = dock.classList.toggle("expanded");
    size.setAttribute("aria-pressed", String(expanded));
    const label = expanded ? "Shrink player cameras" : "Enlarge player cameras";
    size.setAttribute("aria-label", label);
    size.title = label;
    size.textContent = expanded ? "↙" : "↗";
  };
}

export function showBanner(text: string): void {
  const banner = document.getElementById("banner");
  if (!banner) return;
  banner.textContent = text;
  banner.hidden = false;
}

/** Camera-free layout check; placeholders never emit game input or pretend to be inference. */
export function mountFacecamPreview(): void {
  const previews = {} as Record<PlayerId, HTMLCanvasElement>;
  for (const player of ["runner", "saboteur"] as const) {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 360;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = player === "runner" ? "#142c32" : "#29213e";
    ctx.fillRect(0, 0, 320, 360);
    ctx.fillStyle = "#ffffff15";
    ctx.beginPath();
    ctx.arc(160, 130, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(160, 310, 110, 115, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player === "runner" ? "#61edc4" : "#c5a1ff";
    ctx.font = "bold 22px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(player === "runner" ? "LEFT · RUNNER" : "RIGHT · SABOTEUR", 160, 30);
    ctx.font = "20px system-ui";
    ctx.fillText("CAMERA OFF", 160, 310);
    ctx.font = "16px system-ui";
    ctx.fillText("Layout preview", 160, 338);
    previews[player] = canvas;
  }
  mountWebcamCorners({ previews });
}
