import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { inputBus, type InputEvent } from "../shared/input";
import type { VisionHandle } from "../shared/vision";
import { startVision } from "./index";

const models = vi.hoisted(() => ({
  runner: { detect: vi.fn(), close: vi.fn(), backend: "test worker" },
  saboteur: { detect: vi.fn(), close: vi.fn(), backend: "test worker" },
}));
vi.mock("./async-tracker", () => ({
  createAsyncTracker: async (player: "runner" | "saboteur") => models[player],
}));
let now = 0;
let video: {
  videoWidth: number;
  videoHeight: number;
  currentTime: number;
  play: () => Promise<void>;
};
let callbacks: FrameRequestCallback[];
let handle: VisionHandle | undefined;
let unsubscribe: (() => void) | undefined;
const tracked = (x: number) => ({
  landmarks: Array.from({ length: 21 }, () => ({ x, y: 0.5 })),
  gesture: null,
  inferenceMs: 5,
});
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
function context() {
  return new Proxy(
    {},
    {
      get: (target: Record<PropertyKey, unknown>, key: string) =>
        target[key] ?? (target[key] = vi.fn()),
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    },
  );
}
beforeEach(() => {
  now = 0;
  callbacks = [];
  handle = undefined;
  vi.clearAllMocks();
  video = { videoWidth: 1280, videoHeight: 720, currentTime: 0, play: async () => {} };
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: vi.fn() }] }) },
  });
  vi.stubGlobal("document", {
    createElement: (type: string) =>
      type === "video" ? video : { width: 0, height: 0, getContext: () => context() },
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(performance, "now").mockImplementation(() => now);
  models.saboteur.detect.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => {
  handle?.stop();
  unsubscribe?.();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function cameraFrame(t: number) {
  now = t;
  video.currentTime = t / 1000;
  callbacks.shift()!(t);
}

it("sends the actual game bus a runner swipe without waiting for the saboteur", async () => {
  const events: (InputEvent & { source: string })[] = [];
  unsubscribe = inputBus.on("input", (event) => events.push(event));
  models.runner.detect
    .mockResolvedValueOnce(tracked(0.8))
    .mockResolvedValueOnce(tracked(0.69))
    .mockResolvedValueOnce(tracked(0.58));
  handle = await startVision();
  for (const t of [0, 35, 70]) {
    cameraFrame(t);
    await flush();
  }
  expect(events).toEqual([{ player: "runner", action: "left", source: "vision" }]);
  expect(models.saboteur.detect).toHaveBeenCalledOnce();
  expect(models.runner.detect).toHaveBeenCalledTimes(3);
  expect(models.runner.detect.mock.calls[0][0]).not.toBe(handle.previews.runner);
});
it("drops an old worker result rather than completing a swipe from stale positions", async () => {
  let finish!: (value: ReturnType<typeof tracked>) => void;
  models.runner.detect.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const frames: { landmarks: unknown }[] = [];
  const events: InputEvent[] = [];
  unsubscribe = inputBus.on("input", (event) => events.push(event));
  handle = await startVision();
  handle.onFrame((frame) => frames.push(frame));
  cameraFrame(0);
  now = 500;
  finish(tracked(0.8));
  await flush();
  expect(frames[0].landmarks).toBeNull();
  models.runner.detect.mockResolvedValueOnce(tracked(0.69)).mockResolvedValueOnce(tracked(0.58));
  for (const t of [510, 550]) {
    cameraFrame(t);
    await flush();
  }
  expect(events).toEqual([]);
});
