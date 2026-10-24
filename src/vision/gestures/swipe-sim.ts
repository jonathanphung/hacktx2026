import type { Point } from "../../shared/types";
import { DEFAULT_SWIPE, SwipeDetector, type Swipe, type SwipeOptions } from "./swipe";

/** Small deterministic PRNG so simulated hands are reproducible. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

export interface Trial {
  intended: Swipe;
  detected: { swipe: Swipe; t: number }[];
  /** ms from stroke start to the first detection (null if never detected). */
  latency: number | null;
  /** Swipes detected other than the first correct one (ghost return strokes etc). */
  ghosts: number;
  correct: boolean;
}

const smooth = (k: number) => k * k * k * (k * (6 * k - 15) + 10); // minimum-jerk profile

/**
 * One human-like gesture: rest, a stroke in `dir`, a short hold, then the hand drifts back to
 * where it started (slower than the stroke), then rest again. Positions get tracking jitter and
 * frame timing varies like a real webcam pipeline.
 */
export function simulateTrial(
  seed: number,
  dir: Swipe,
  options?: Partial<SwipeOptions>,
  make: (o?: Partial<SwipeOptions>) => SwipeDetector = (o) =>
    new SwipeDetector({ ...DEFAULT_SWIPE, ...o }),
  /** True: the player deliberately flicks back instead of drifting back. */
  reversal = false,
): Trial {
  const r = rng(seed);
  const between = (a: number, b: number) => a + (b - a) * r();
  const amplitude = between(0.22, 0.5);
  const strokeMs = between(110, 300);
  const holdMs = reversal ? between(80, 220) : between(60, 350);
  const returnMs = reversal ? strokeMs * between(0.8, 1.1) : between(220, 550);
  const drift = between(-0.2, 0.2); // stroke is never perfectly on-axis
  const jitter = between(0.002, 0.007);
  const fps = [20, 25, 30, 30, 30][Math.floor(r() * 5)];
  const unit = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
  const origin: Point = { x: between(0.35, 0.65), y: between(0.4, 0.6) };
  const restMs = between(150, 500);
  const total = restMs + strokeMs + holdMs + returnMs + 900;
  const detector = make(options);
  const detected: { swipe: Swipe; t: number }[] = [];
  let t = 0;
  while (t < total) {
    const local = t - restMs;
    let along = 0;
    if (local >= 0) {
      if (local < strokeMs) along = amplitude * smooth(local / strokeMs);
      else if (local < strokeMs + holdMs) along = amplitude;
      else if (local < strokeMs + holdMs + returnMs)
        along = amplitude * (1 - smooth((local - strokeMs - holdMs) / returnMs));
    }
    const side = along * drift;
    const point = {
      x: origin.x + unit[0] * along + (unit[0] === 0 ? side : 0) + (r() - 0.5) * 2 * jitter,
      y: origin.y + unit[1] * along + (unit[1] === 0 ? side : 0) + (r() - 0.5) * 2 * jitter,
    };
    const swipe = detector.push(t, point);
    if (swipe) detected.push({ swipe, t });
    t += 1000 / fps + (r() - 0.5) * 12;
  }
  const first = detected.find((d) => d.swipe === dir);
  return {
    intended: dir,
    detected,
    latency: first ? first.t - restMs : null,
    ghosts: detected.length - (first ? 1 : 0),
    correct: !!first,
  };
}

export function evaluate(
  trials = 400,
  options?: Partial<SwipeOptions>,
  make?: (o?: Partial<SwipeOptions>) => SwipeDetector,
) {
  const dirs: Swipe[] = ["left", "right", "up"];
  let correct = 0;
  let ghost = 0;
  let wrongDirection = 0;
  const latencies: number[] = [];
  for (let i = 0; i < trials; i++) {
    const trial = simulateTrial(1000 + i, dirs[i % 3], options, make);
    if (trial.correct) {
      correct++;
      latencies.push(trial.latency!);
    }
    ghost += trial.ghosts;
    wrongDirection += trial.detected.filter((d) => d.swipe !== trial.intended).length;
  }
  latencies.sort((a, b) => a - b);
  return {
    detectionRate: correct / trials,
    ghostsPerTrial: ghost / trials,
    wrongDirectionPerTrial: wrongDirection / trials,
    medianLatencyMs: latencies[Math.floor(latencies.length / 2)] ?? NaN,
    p90LatencyMs: latencies[Math.floor(latencies.length * 0.9)] ?? NaN,
  };
}

/** Deliberate flick-and-flick-back: both strokes should register, in order. */
export function evaluateReversal(
  trials = 300,
  options?: Partial<SwipeOptions>,
  make?: (o?: Partial<SwipeOptions>) => SwipeDetector,
) {
  const dirs: Swipe[] = ["left", "right", "up"];
  const opposite = { left: "right", right: "left", up: "down", down: "up" } as const;
  let both = 0;
  for (let i = 0; i < trials; i++) {
    const dir = dirs[i % 3];
    const trial = simulateTrial(5000 + i, dir, options, make, true);
    const seq = trial.detected.map((d) => d.swipe);
    if (seq[0] === dir && seq[1] === opposite[dir]) both++;
  }
  return { reversalRate: both / trials };
}
