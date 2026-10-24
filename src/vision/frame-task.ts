/** Independent, queue-free lane. A slow saboteur must never hold runner input back. */
export class FrameTask<T> {
  private busy = false;
  private active = true;
  private lastFrame = -1;
  canRun(frame: number) {
    return this.active && !this.busy && frame !== this.lastFrame;
  }
  run(
    frame: number,
    work: () => Promise<T>,
    accept: (result: T) => void,
    fail: (error: unknown) => void,
    onIdle?: () => void,
  ) {
    if (!this.canRun(frame)) return;
    this.lastFrame = frame;
    this.busy = true;
    // Start capture immediately, before the next preview redraw.
    let result: Promise<T>;
    try {
      result = work();
    } catch (error) {
      this.busy = false;
      if (this.active) fail(error);
      return;
    }
    void result
      .then((value) => {
        if (this.active) accept(value);
      })
      .catch((error) => {
        if (this.active) fail(error);
      })
      .finally(() => {
        this.busy = false;
        if (this.active) onIdle?.();
      });
  }
  stop() {
    this.active = false;
  }
}
