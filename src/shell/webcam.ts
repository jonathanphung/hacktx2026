import type { PlayerId } from "../shared/types";
import type { VisionHandle } from "../shared/vision";

const PLAYERS = ["runner", "saboteur"] as const;
const LABELS: Record<PlayerId, string> = {
  runner: "P1 · Runner · Left",
  saboteur: "P2 · Saboteur · Right",
};

/** Camera startup begins in main; keep its presentation here in the shell. */
const keyboardOnly = new URLSearchParams(location.search).has("novision");
showBanner(
  keyboardOnly
    ? "Keyboard mode · P1: A / D / W · P2: J / K / L + Space"
    : "Setting up camera… Allow camera access when prompted. You can also play with the keyboard.",
);

/** Shows the existing vision previews and readiness without changing gesture recognition. */
export function mountWebcamCorners(
  vision: Pick<VisionHandle, "previews"> & Partial<Pick<VisionHandle, "onFrame">>,
): void {
  const statuses = new Map<PlayerId, HTMLElement>();
  const visible = new Map<PlayerId, boolean>();
  for (const player of PLAYERS) {
    const corner = document.getElementById(`cam-${player}`);
    if (!corner) continue;
    const label = document.createElement("div");
    label.className = "cam-label";
    label.textContent = LABELS[player];
    const status = document.createElement("div");
    status.className = "cam-status";
    status.setAttribute("role", "status");
    status.textContent = "Raise one hand in your half";
    corner.replaceChildren(label, vision.previews[player], status);
    corner.dataset.ready = "false";
    statuses.set(player, status);
    visible.set(player, false);
  }
  setupCameraDock();
  if (!vision.onFrame) return;
  showBanner("Stand side by side: runner on the left, saboteur on the right. Raise one hand each.");

  const unsubscribe = vision.onFrame((frame) => {
    const detected = !!frame.landmarks?.length;
    if (visible.get(frame.player) === detected) return;
    visible.set(frame.player, detected);
    const status = statuses.get(frame.player);
    if (status)
      status.textContent = detected ? "Hand detected · Ready" : "Hand missing · Raise one hand";
    const corner = document.getElementById(`cam-${frame.player}`);
    if (corner) corner.dataset.ready = String(detected);
    const banner = document.getElementById("banner");
    if (banner) banner.hidden = PLAYERS.every((player) => visible.get(player));
  });
  // Vision and the previews live across game restarts, with one subscription per page.
  window.addEventListener("pagehide", unsubscribe, { once: true });
}

export function showBanner(text: string): void {
  const banner = document.getElementById("banner");
  if (!banner) return;
  banner.textContent = text;
  banner.hidden = false;
  banner.setAttribute("role", "status");
  // main reports camera startup failures through this existing shell entry point.
  if (text.startsWith("Camera unavailable")) {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry camera";
    retry.addEventListener("click", () => location.reload());
    const keyboard = document.createElement("a");
    const url = new URL(location.href);
    url.searchParams.set("novision", "");
    keyboard.href = url.href;
    keyboard.textContent = "Keyboard mode";
    banner.append(" ", retry, " ", keyboard);
  }
}

function setupCameraDock(): void {
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
