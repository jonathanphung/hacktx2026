import type { HandFrame } from "../shared/vision";
import { percentile } from "./performance";

export interface AimRange {
  readonly minX: number;
  readonly maxX: number;
}
export interface VisionSettings {
  readonly version: 1;
  readonly swipeDistance: number;
  readonly aim: AimRange;
}
export const DEFAULT_SETTINGS: VisionSettings = Object.freeze({
  version: 1,
  swipeDistance: 0.2,
  aim: Object.freeze({ minX: 0, maxX: 1 }),
});
const STORAGE_KEY = "hacktx.vision.settings.v1";

export function parseSettings(value: unknown): VisionSettings {
  if (!value || typeof value !== "object") throw new Error("Invalid vision settings");
  const s = value as VisionSettings;
  if (
    s.version !== 1 ||
    !Number.isFinite(s.swipeDistance) ||
    s.swipeDistance < 0.12 ||
    s.swipeDistance > 0.3 ||
    !s.aim ||
    !Number.isFinite(s.aim.minX) ||
    !Number.isFinite(s.aim.maxX) ||
    s.aim.minX < 0 ||
    s.aim.maxX > 1 ||
    s.aim.maxX - s.aim.minX < 0.25
  )
    throw new Error("Invalid vision settings");
  return Object.freeze({
    version: 1,
    swipeDistance: s.swipeDistance,
    aim: Object.freeze({ minX: s.aim.minX, maxX: s.aim.maxX }),
  });
}
function loadSettings(): VisionSettings {
  try {
    return parseSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return DEFAULT_SETTINGS;
  }
}
let settings = loadSettings();
export const getVisionSettings = () => settings;

/** Only numeric preferences are persisted. No frames, images or identity data. */
export function saveVisionSettings(value: VisionSettings): boolean {
  settings = parseSettings(value);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
if (typeof window !== "undefined")
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) settings = loadSettings();
  });
export function aimPosition(x: number, range: AimRange): number {
  return Math.min(1, Math.max(0, (x - range.minX) / (range.maxX - range.minX)));
}

/** Five seconds of live frames; quantiles reject isolated landmark outliers. */
export class AimCalibration {
  private xs: number[] = [];
  private frames = 0;
  private last = -Infinity;
  private end = 0;
  private maxGapMs = 0;
  constructor(
    readonly start: number,
    readonly durationMs = 5000,
  ) {}
  push(frame: HandFrame): boolean {
    if (
      frame.player !== "saboteur" ||
      !Number.isFinite(frame.t) ||
      frame.t < this.start ||
      frame.t <= this.last
    )
      return false;
    this.maxGapMs = Math.max(
      this.maxGapMs,
      frame.t - (this.last === -Infinity ? this.start : this.last),
    );
    this.last = frame.t;
    this.end = frame.t;
    this.frames++;
    const x = frame.landmarks?.[9]?.x;
    if (x !== undefined && Number.isFinite(x) && x >= 0 && x <= 1 && this.xs.length < 1000)
      this.xs.push(x);
    return frame.t - this.start >= this.durationMs;
  }
  result(): AimRange {
    if (this.end - this.start < this.durationMs)
      throw new Error("Keep sweeping until the five-second capture finishes.");
    if (this.xs.length < 30 || this.xs.length / this.frames < 0.7)
      throw new Error(
        "Hand tracking was too intermittent. Move closer, improve lighting and try again.",
      );
    if (this.maxGapMs > 250)
      throw new Error("Camera frames paused during capture. Close other busy tabs and try again.");
    const minX = percentile(this.xs, 0.05);
    const maxX = percentile(this.xs, 0.95);
    if (maxX - minX < 0.25)
      throw new Error("Move farther left and right within your half, then try again.");
    return { minX, maxX };
  }
}
