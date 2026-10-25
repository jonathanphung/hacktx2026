export type Ease = (t: number) => number;

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const linear: Ease = clamp01;
export const inOut: Ease = (t) => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOut: Ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn: Ease = (t) => Math.pow(clamp01(t), 3);
/** Overshoots slightly, then settles: the "slam" feel of a camera or prop landing. */
export const backOut: Ease = (t) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  t = clamp01(t);
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export interface Key {
  /** Time, in whatever unit the track is evaluated in. */
  t: number;
  v: number;
  /** Easing for the segment that ENDS at this key. Defaults to inOut. */
  e?: Ease;
}

/** A continuous value over time from keyframes; holds the first/last value outside the range. */
export function track(keys: readonly Key[]): (t: number) => number {
  return (t) => {
    if (t <= keys[0].t) return keys[0].v;
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i].t) {
        const a = keys[i - 1];
        const b = keys[i];
        const k = (b.e ?? inOut)((t - a.t) / (b.t - a.t));
        return a.v + (b.v - a.v) * k;
      }
    }
    return keys[keys.length - 1].v;
  };
}
