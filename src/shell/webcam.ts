import type { PlayerId } from "../shared/types";
import type { VisionHandle } from "../shared/vision";

/** Shows each player's half of the camera in their top corner of the screen. */
export function mountWebcamCorners(vision: VisionHandle): void {
  for (const player of ["runner", "saboteur"] as PlayerId[]) {
    document.getElementById(`cam-${player}`)?.append(vision.previews[player]);
  }
}

export function showBanner(text: string): void {
  const banner = document.getElementById("banner");
  if (!banner) return;
  banner.textContent = text;
  banner.hidden = false;
}
