/** Deliver each presented camera frame once; preview rendering uses its own animation loop. */
export function watchCameraFrames(
  video: HTMLVideoElement,
  onFrame: (id: number) => void,
): (() => void) | null {
  if (typeof video.requestVideoFrameCallback !== "function") return null;
  let active = true;
  let id = 0;
  const tick: VideoFrameRequestCallback = (_now, metadata) => {
    if (!active) return;
    onFrame(metadata.presentedFrames);
    if (active) id = video.requestVideoFrameCallback(tick);
  };
  id = video.requestVideoFrameCallback(tick);
  return () => {
    active = false;
    video.cancelVideoFrameCallback?.(id);
  };
}
