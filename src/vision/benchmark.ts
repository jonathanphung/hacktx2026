import { createAsyncTracker, type AsyncTracker } from "./async-tracker";
import { VisionPerformance } from "./performance";

/** Real models, synthetic empty images. Measures inference and UI stalls, NOT hand accuracy. */
export async function benchmarkVision(signal: AbortSignal, progress: (text: string) => void) {
  const trackers: AsyncTracker[] = [];
  let heartbeat = 0;
  let previous = 0;
  let maxUiGap = 0;
  let uiStalls = 0;
  const monitor = (t: number) => {
    if (previous) {
      const gap = t - previous;
      maxUiGap = Math.max(maxUiGap, gap);
      if (gap > 50) uiStalls++;
    }
    previous = t;
    heartbeat = requestAnimationFrame(monitor);
  };
  heartbeat = requestAnimationFrame(monitor);
  const stats = new VisionPerformance();
  try {
    progress("Loading runner model…");
    trackers.push(await createAsyncTracker("runner", signal));
    signal.throwIfAborted();
    progress("Loading saboteur model…");
    trackers.push(await createAsyncTracker("saboteur", signal));
    signal.throwIfAborted();
    const image = document.createElement("canvas");
    image.width = 320;
    image.height = 360;
    const ctx = image.getContext("2d")!;
    ctx.fillStyle = "#202020";
    ctx.fillRect(0, 0, image.width, image.height);
    // One warm-up, excluded from steady-state model timing (included in UI responsiveness).
    await Promise.all(trackers.map((tracker) => tracker.detect(image, performance.now())));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const startupUiGap = maxUiGap;
    const startupUiStalls = uiStalls;
    previous = 0;
    maxUiGap = 0;
    uiStalls = 0;
    for (let i = 0; i < 60; i++) {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const t = performance.now();
      const [runner, saboteur] = await Promise.all(
        trackers.map((tracker) => tracker.detect(image, t)),
      );
      signal.throwIfAborted();
      stats.push({
        t,
        roundTripMs: performance.now() - t,
        runnerMs: runner.inferenceMs,
        saboteurMs: saboteur.inferenceMs,
        runnerHand: !!runner.landmarks,
        saboteurHand: !!saboteur.landmarks,
        backends: { runner: trackers[0].backend, saboteur: trackers[1].backend },
      });
      progress(`Benchmark ${i + 1}/60 · ${trackers[0].backend} + ${trackers[1].backend}`);
    }
    return { ...stats.summary(), maxUiGap, uiStalls, startupUiGap, startupUiStalls };
  } finally {
    cancelAnimationFrame(heartbeat);
    trackers.forEach((tracker) => tracker.close());
  }
}
