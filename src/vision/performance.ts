import type { PlayerId } from "../shared/types";

export interface VisionTiming {
  t: number;
  roundTripMs: number;
  runnerMs: number;
  saboteurMs: number;
  runnerHand: boolean;
  saboteurHand: boolean;
  backends: Record<PlayerId, string>;
}
export function percentile(values: readonly number[], fraction: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1))];
}

/** Bounded rolling window: timings are diagnostics, never game input or a frame backlog. */
export class VisionPerformance {
  private samples: VisionTiming[] = [];
  push(sample: VisionTiming) {
    this.samples.push(sample);
    if (this.samples.length > 120) this.samples.shift();
  }
  summary() {
    const samples = this.samples;
    const elapsed = samples.length > 1 ? samples[samples.length - 1].t - samples[0].t : 0;
    return {
      frames: samples.length,
      fps: elapsed > 0 ? ((samples.length - 1) * 1000) / elapsed : 0,
      p50: percentile(
        samples.map((s) => s.roundTripMs),
        0.5,
      ),
      p95: percentile(
        samples.map((s) => s.roundTripMs),
        0.95,
      ),
      runnerMs: percentile(
        samples.map((s) => s.runnerMs),
        0.5,
      ),
      saboteurMs: percentile(
        samples.map((s) => s.saboteurMs),
        0.5,
      ),
      runnerCoverage: samples.length
        ? samples.filter((s) => s.runnerHand).length / samples.length
        : 0,
      saboteurCoverage: samples.length
        ? samples.filter((s) => s.saboteurHand).length / samples.length
        : 0,
      backends: samples.at(-1)?.backends,
    };
  }
}
