import { easeOut } from "./easing";
import { STORY_BEAT_MS } from "./story-timeline";

export interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
}
export interface Ring {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

/** Everything is a pure function of time, so a frame can be sampled anywhere and tested. */
interface Burst {
  /** Start, in beats. */
  t0: number;
  x: number;
  y: number;
  n: number;
  /** Units per second. */
  speed: number;
  /** Seconds. */
  life: number;
  colors: readonly string[];
  /** Units per second squared, pulling down. */
  gravity?: number;
  size?: number;
  /** Centre direction in radians and the arc it covers (default: all around). */
  dir?: number;
  arc?: number;
}
interface RingDef {
  t0: number;
  x: number;
  y: number;
  maxR: number;
  life: number;
}

const frac = (v: number) => v - Math.floor(v);
const hash = (i: number, seed: number) => frac(Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453);

export function sampleBursts(bursts: readonly Burst[], t: number): Particle[] {
  const out: Particle[] = [];
  for (const b of bursts) {
    const sec = ((t - b.t0) * STORY_BEAT_MS) / 1000;
    if (sec < 0 || sec > b.life) continue;
    const k = sec / b.life;
    for (let i = 0; i < b.n; i++) {
      const arc = b.arc ?? Math.PI * 2;
      const a = (b.dir ?? 0) + arc * (i / b.n - 0.5) + (hash(i, b.t0) - 0.5) * 0.35;
      const v = b.speed * (0.45 + hash(i + 31, b.t0) * 0.9);
      out.push({
        x: b.x + Math.cos(a) * v * sec,
        y: b.y + Math.sin(a) * v * sec + 0.5 * (b.gravity ?? 0) * sec * sec,
        size: (b.size ?? 2) * (1 - 0.55 * k),
        color: b.colors[i % b.colors.length],
        alpha: 1 - k * k,
      });
    }
  }
  return out;
}
export function sampleRings(rings: readonly RingDef[], t: number): Ring[] {
  const out: Ring[] = [];
  for (const r of rings) {
    const sec = ((t - r.t0) * STORY_BEAT_MS) / 1000;
    if (sec < 0 || sec > r.life) continue;
    out.push({ x: r.x, y: r.y, r: r.maxR * easeOut(sec / r.life), alpha: 1 - sec / r.life });
  }
  return out;
}

const SPARK = ["#fff6dc", "#ffe08a", "#ffffff"] as const;
const SHARD = ["#e4d7ee", "#b59bc0", "#8a7297", "#fff6dc"] as const;
const DUST = ["#d9cfa3", "#b6a67d", "#e6dcb8"] as const;
const FIREWORK = [
  ["#ff7a8a", "#ffd0d6", "#fff6dc"],
  ["#7ae0ff", "#d4f6ff", "#ffffff"],
  ["#ffe08a", "#fff4c2", "#ffb45e"],
  ["#b78cff", "#e8d8ff", "#ffffff"],
  ["#8fe38a", "#d4f7cf", "#ffe08a"],
] as const;

export const OPENING_FX = {
  bursts: [
    // The grab: a spray of sparks, then dust from the hand's wind.
    { t0: 2.65, x: 110, y: 130, n: 18, speed: 95, life: 0.7, colors: SPARK, gravity: 60 },
    {
      t0: 2.65,
      x: 110,
      y: 150,
      n: 10,
      speed: 40,
      life: 0.9,
      colors: DUST,
      size: 3,
      dir: -Math.PI / 2,
      arc: 2,
    },
    // The cell door slamming.
    { t0: 3.45, x: 274, y: 92, n: 12, speed: 50, life: 0.8, colors: DUST, gravity: 40, size: 3 },
    // Jon's leap off the ground.
    {
      t0: 4.7,
      x: 221,
      y: 152,
      n: 10,
      speed: 38,
      life: 0.7,
      colors: DUST,
      size: 3,
      dir: -Math.PI / 2,
      arc: 2.4,
    },
  ] satisfies Burst[],
  rings: [{ t0: 2.65, x: 110, y: 128, maxR: 55, life: 0.45 }] satisfies RingDef[],
};

/** A trail of sparks behind the pair as they slide down the stalk. */
const slideTrail: Burst[] = Array.from({ length: 24 }, (_, i) => {
  const t0 = 1.4 + i * 0.026;
  return {
    t0,
    x: 227 + (i % 2 ? 4 : -4),
    y: 90 + ((t0 - 1.4) / 0.55) ** 2 * 44,
    n: 3,
    speed: 18,
    life: 0.6,
    colors: SPARK,
    gravity: -20,
    size: 1.6,
    dir: -Math.PI / 2,
    arc: 1.4,
  };
});

export const ENDING_FX = {
  bursts: [
    // The lock shatters: shards, golden sparks.
    {
      t0: 1.0,
      x: 274,
      y: 70,
      n: 30,
      speed: 105,
      life: 1.5,
      colors: SHARD,
      gravity: 150,
      size: 2.4,
    },
    { t0: 1.0, x: 274, y: 70, n: 22, speed: 70, life: 1.2, colors: SPARK, gravity: 20, size: 2 },
    ...slideTrail,
    // Landing at the foot of the stalk.
    {
      t0: 1.96,
      x: 205,
      y: 152,
      n: 16,
      speed: 52,
      life: 0.9,
      colors: DUST,
      size: 3,
      dir: -Math.PI / 2,
      arc: 2.8,
    },
    // Dawn fireworks over the valley.
    { t0: 3.08, x: 88, y: 66, n: 30, speed: 62, life: 1.7, colors: FIREWORK[0], gravity: 38 },
    { t0: 3.3, x: 168, y: 52, n: 30, speed: 66, life: 1.7, colors: FIREWORK[1], gravity: 38 },
    { t0: 3.48, x: 244, y: 70, n: 30, speed: 60, life: 1.7, colors: FIREWORK[2], gravity: 38 },
    { t0: 3.62, x: 122, y: 86, n: 26, speed: 52, life: 1.6, colors: FIREWORK[3], gravity: 38 },
    { t0: 3.78, x: 204, y: 60, n: 30, speed: 64, life: 1.6, colors: FIREWORK[4], gravity: 38 },
  ] satisfies Burst[],
  rings: [
    { t0: 1.0, x: 274, y: 70, maxR: 120, life: 0.6 },
    { t0: 1.02, x: 274, y: 70, maxR: 70, life: 0.45 },
    { t0: 1.96, x: 205, y: 150, maxR: 36, life: 0.4 },
  ] satisfies RingDef[],
};

export function storyParticles(ending: boolean, t: number): Particle[] {
  return sampleBursts((ending ? ENDING_FX : OPENING_FX).bursts, t);
}
export function storyRings(ending: boolean, t: number): Ring[] {
  return sampleRings((ending ? ENDING_FX : OPENING_FX).rings, t);
}

export const SPELL = "HACKTX";
export interface SpellLetter {
  ch: string;
  x: number;
  y: number;
  alpha: number;
  scale: number;
}
/**
 * The six clue letters orbit the cell, faster and tighter until they slam together and break
 * the lock at beat 1.0. Hidden outside that window.
 */
export function spellLetters(ending: boolean, t: number): SpellLetter[] {
  if (!ending || t < 0.04 || t >= 1.0) return [];
  const appear = easeOut((t - 0.04) / 0.2);
  const gather = Math.max(0, (t - 0.72) / 0.28);
  const radius = 34 * (1 - gather * gather) + 2;
  const spin = t * 5.2 + t * t * 9;
  return [...SPELL].map((ch, i) => {
    const a = spin + (i / SPELL.length) * Math.PI * 2;
    return {
      ch,
      x: 274 + Math.cos(a) * radius * 1.25,
      y: 66 + Math.sin(a) * radius * 0.7,
      alpha: appear,
      scale: 1 + 0.5 * Math.sin(t * 22 + i) * (1 - gather) + gather * 0.8,
    };
  });
}
