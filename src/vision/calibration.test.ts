import { afterEach, expect, it, vi } from "vitest";
import type { HandFrame } from "../shared/vision";
import {
  AimCalibration,
  DEFAULT_SETTINGS,
  aimPosition,
  getVisionSettings,
  parseSettings,
  saveVisionSettings,
} from "./calibration";

function frame(t: number, x: number | null, player: HandFrame["player"] = "saboteur"): HandFrame {
  return {
    t,
    player,
    gesture: "Open_Palm",
    landmarks: x === null ? null : Array.from({ length: 21 }, () => ({ x, y: 0.5 })),
  };
}
afterEach(() => {
  saveVisionSettings(DEFAULT_SETTINGS);
  vi.unstubAllGlobals();
});
it("captures a comfortable reach and trims isolated landmark spikes", () => {
  const capture = new AimCalibration(0);
  for (let i = 0; i <= 150; i++) {
    const x = i === 0 ? 0 : i === 1 ? 1 : 0.2 + 0.6 * (0.5 + Math.sin(i / 10) * 0.5);
    capture.push(frame(i * 34, x));
  }
  const range = capture.result();
  expect(range.minX).toBeGreaterThan(0.19);
  expect(range.maxX).toBeLessThan(0.81);
  expect(range.maxX - range.minX).toBeGreaterThan(0.5);
});
it("rejects an incomplete capture", () => {
  const capture = new AimCalibration(0);
  capture.push(frame(100, 0.3));
  expect(() => capture.result()).toThrow("five-second");
});
it("rejects missing hands instead of silently calibrating to noise", () => {
  const capture = new AimCalibration(0);
  for (let t = 0; t <= 5000; t += 50) capture.push(frame(t, t % 500 === 0 ? 0.5 : null));
  expect(() => capture.result()).toThrow("intermittent");
});
it("rejects idle hands with insufficient movement", () => {
  const capture = new AimCalibration(0);
  for (let t = 0; t <= 5000; t += 50) capture.push(frame(t, 0.5 + Math.sin(t) * 0.01));
  expect(() => capture.result()).toThrow("farther");
});
it("ignores runner frames, duplicates and timestamps before capture", () => {
  const capture = new AimCalibration(100);
  expect(capture.push(frame(80, 0.1))).toBe(false);
  expect(capture.push(frame(6000, 0.9, "runner"))).toBe(false);
  for (let i = 0; i < 100; i++) capture.push(frame(100, 0.5));
  capture.push(frame(5100, 0.9));
  expect(() => capture.result()).toThrow("intermittent");
});
it("maps measured reach to all lanes and clamps overshoot", () => {
  const range = { minX: 0.25, maxX: 0.75 };
  expect(aimPosition(0.25, range)).toBe(0);
  expect(aimPosition(0.5, range)).toBe(0.5);
  expect(aimPosition(0.75, range)).toBe(1);
  expect(aimPosition(0.9, range)).toBe(1);
});
it.each([
  { ...DEFAULT_SETTINGS, version: 2 },
  { ...DEFAULT_SETTINGS, swipeDistance: NaN },
  { ...DEFAULT_SETTINGS, swipeDistance: 0 },
  { ...DEFAULT_SETTINGS, aim: { minX: 0.6, maxX: 0.4 } },
  { ...DEFAULT_SETTINGS, aim: { minX: 0.49, maxX: 0.5 } },
  { ...DEFAULT_SETTINGS, aim: { minX: -1, maxX: 1 } },
])("rejects unsafe or incompatible settings %#", (settings) => {
  expect(() => parseSettings(settings)).toThrow();
});
it("persists only validated numeric preferences", () => {
  const setItem = vi.fn();
  vi.stubGlobal("localStorage", { setItem });
  expect(saveVisionSettings({ ...DEFAULT_SETTINGS, swipeDistance: 0.14 })).toBe(true);
  expect(JSON.parse(setItem.mock.calls[0][1])).toEqual({
    version: 1,
    swipeDistance: 0.14,
    aim: { minX: 0, maxX: 1 },
  });
  expect(Object.isFrozen(getVisionSettings().aim)).toBe(true);
});
it("keeps working in memory if browser storage is blocked", () => {
  vi.stubGlobal("localStorage", {
    setItem: () => {
      throw new Error("Blocked");
    },
  });
  expect(saveVisionSettings({ ...DEFAULT_SETTINGS, swipeDistance: 0.28 })).toBe(false);
  expect(getVisionSettings().swipeDistance).toBe(0.28);
});

it("rejects a large camera stall even when the visible frames all have hands", () => {
  const capture = new AimCalibration(0);
  for (let t = 0; t <= 1500; t += 50) capture.push(frame(t, t % 100 === 0 ? 0.2 : 0.8));
  capture.push(frame(5000, 0.8));
  expect(() => capture.result()).toThrow("paused");
});
