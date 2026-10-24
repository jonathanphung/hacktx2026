import { expect, it, vi } from "vitest";
import { watchCameraFrames } from "./camera-clock";
it("uses actual presented frames, stops cleanly and ignores a late callback", () => {
  let callback!: VideoFrameRequestCallback;
  const video = {
    requestVideoFrameCallback: vi.fn((fn) => {
      callback = fn;
      return 7;
    }),
    cancelVideoFrameCallback: vi.fn(),
  } as unknown as HTMLVideoElement;
  const onFrame = vi.fn();
  const stop = watchCameraFrames(video, onFrame)!;
  callback(100, { presentedFrames: 42 } as VideoFrameCallbackMetadata);
  expect(onFrame).toHaveBeenCalledWith(42);
  stop();
  callback(200, { presentedFrames: 43 } as VideoFrameCallbackMetadata);
  expect(onFrame).toHaveBeenCalledOnce();
  expect(video.cancelVideoFrameCallback).toHaveBeenCalledWith(7);
});
it("allows the animation-frame fallback in older browsers", () => {
  expect(watchCameraFrames({} as HTMLVideoElement, vi.fn())).toBeNull();
});
