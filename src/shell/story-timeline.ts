import { backOut, easeIn, easeOut, inOut, linear, track } from "./easing";

/** One story beat (one caption). Slow enough to read the line before the next one arrives. */
export const STORY_BEAT_MS = 4600;
export const OPENING_BEATS = [
  {
    speaker: "JON",
    title: "A light in the woods",
    text: "Claude saw a glow drifting between the trees, and we followed it.",
  },
  {
    speaker: "CLAUDE",
    title: "Something is wrong",
    text: "Jon… the clouds are moving. And that is not a cloud.",
  },
  {
    speaker: "THE GIANT",
    title: "Taken to the tower",
    text: "A wizard’s companion? My highest cell has room for one more!",
  },
  {
    speaker: "CLAUDE",
    title: "Six clues. One way home.",
    text: "Jon! Follow the five tales. Find Xen’s last clue. Break the lock!",
  },
  { speaker: "JON", title: "The climb begins", text: "Hold on, Claude. I’m coming for you." },
] as const;
export const ENDING_BEATS = [
  {
    speaker: "CLAUDE",
    title: "The spell is broken",
    text: "Six clues, six letters. The lock never stood a chance.",
  },
  {
    speaker: "JON",
    title: "Together, down the beanstalk",
    text: "Hold on tight, Claude. This is the fast way down!",
  },
  {
    speaker: "THE GIANT",
    title: "A grudging goodbye",
    text: "Hmph. Fine. Go. …You may visit. Bring snacks.",
  },
  {
    speaker: "TOGETHER AGAIN",
    title: "No companion left behind",
    text: "Six small treasures opened the biggest door. Now, let’s go home.",
  },
] as const;

/** Story stage size in "pixels" (the art is drawn on this grid, then scaled up). */
export const STAGE = { w: 320, h: 180 } as const;

/** When the giant's hand closes on Claude, in beats: the one moment the film freezes briefly. */
export const GRAB_BEAT = 2.65;
export const HIT_STOP_MS = 110;
/** The moment the six letters break the lock in the ending, in beats. */
export const SHATTER_BEAT = 1.0;

/** True on the tick that carries the clock across the grab, so the renderer can freeze briefly. */
export function crossesGrab(ending: boolean, before: number, after: number): boolean {
  const at = GRAB_BEAT * STORY_BEAT_MS;
  return !ending && before < at && after >= at;
}
export function crossesShatter(ending: boolean, before: number, after: number): boolean {
  const at = SHATTER_BEAT * STORY_BEAT_MS;
  return ending && before < at && after >= at;
}

export interface StoryFrame {
  jon: { x: number; y: number; state: "idle" | "run" | "jump"; bob: number };
  claude: { x: number; y: number; roll: number };
  hand: { x: number; y: number; visible: boolean; roll: number };
  /** The wisp that leads the heroes into the woods (opening). */
  orb: { x: number; y: number; alpha: number };
  /** The giant's shadow creeping over the ground. `s` is 0..1 size. */
  shadow: { x: number; s: number };
  /** The "!" over Claude's head, 0..1. */
  bubble: { x: number; y: number; a: number };
  /** Camera centre in stage units, zoom (1 = whole stage) and roll in degrees. */
  camera: { x: number; y: number; zoom: number; roll: number };
  /** Shake amplitude in stage units (the renderer turns it into jitter). */
  shake: number;
  /** 0..1 white flash. */
  flash: number;
  /** 0..1 ominous darkening (opening). */
  dark: number;
  /** 0..1 cinema bars. */
  letterbox: number;
  /** 0..1 how far the cell bars have slammed in. */
  cell: number;
  /** 0..1 how far the cell bars have burst apart (ending). */
  cellBreak: number;
  /** 0..1 how much of the dawn sky shows over the night sky (ending). */
  dawn: number;
  /** 0..1 sun rise (ending). */
  sun: number;
  /** 0..1 "THE END" card (ending). */
  title: number;
}

/** How far the camera centre may stray from the middle at a zoom before the stage edge shows. */
export function clampCamera(x: number, y: number, zoom: number) {
  const mx = (STAGE.w / 2) * (1 - 1 / zoom);
  const my = (STAGE.h / 2) * (1 - 1 / zoom);
  return {
    x: Math.max(STAGE.w / 2 - mx, Math.min(STAGE.w / 2 + mx, x)),
    y: Math.max(STAGE.h / 2 - my, Math.min(STAGE.h / 2 + my, y)),
  };
}

const decay = (t: number, at: number, rate: number) => (t < at ? 0 : Math.exp(-(t - at) * rate));
/** Smooth 0→1 between two beats. */
const ramp = (t: number, a: number, b: number) => easeOut((t - a) / (b - a));

const OPENING = {
  jonX: track([
    { t: 0, v: 36 },
    { t: 1, v: 88, e: linear },
    { t: 1.5, v: 96, e: easeOut },
    { t: 2.25, v: 96 },
    { t: 2.65, v: 112, e: easeIn },
    { t: 3.1, v: 104, e: easeOut },
    { t: 3.45, v: 142, e: inOut },
    { t: 4.0, v: 142 },
    { t: 4.7, v: 221, e: inOut },
  ]),
  jonY: track([
    { t: 4.7, v: 132 },
    { t: 4.82, v: 106, e: easeOut },
    { t: 5, v: 89, e: inOut },
  ]),
  claudeX: track([
    { t: 0, v: 66 },
    { t: 0.5, v: 118, e: easeOut },
    { t: 1, v: 114, e: inOut },
    { t: 2.65, v: 120, e: linear },
    { t: 3.45, v: 274, e: inOut },
  ]),
  claudeY: track([
    { t: 2.5, v: 137 },
    { t: 2.65, v: 130, e: easeOut },
    { t: 2.95, v: 96, e: easeOut },
    { t: 3.45, v: 70, e: backOut },
  ]),
  handY: track([
    { t: 2.0, v: -100 },
    { t: 2.65, v: 108, e: easeIn },
    { t: 3.45, v: -100, e: inOut },
  ]),
  orbX: track([
    { t: 0, v: 118 },
    { t: 0.6, v: 168, e: inOut },
    { t: 1.0, v: 205, e: inOut },
    { t: 1.25, v: 230, e: easeIn },
  ]),
  orbY: track([
    { t: 0, v: 104 },
    { t: 0.5, v: 90, e: inOut },
    { t: 1.0, v: 98, e: inOut },
    { t: 1.25, v: 60, e: easeIn },
  ]),
  camX: track([
    { t: 0, v: 90 },
    { t: 1.0, v: 118, e: inOut },
    { t: 2.0, v: 112, e: inOut },
    { t: 2.45, v: 108, e: inOut },
    { t: 2.65, v: 110 },
    { t: 3.45, v: 240, e: inOut },
    { t: 4.0, v: 248, e: easeOut },
    { t: 4.45, v: 150, e: inOut },
    { t: 4.7, v: 205, e: inOut },
    { t: 5, v: 236, e: inOut },
  ]),
  camY: track([
    { t: 0, v: 124 },
    { t: 1.0, v: 118, e: inOut },
    { t: 1.6, v: 120, e: inOut },
    { t: 2.3, v: 100, e: inOut },
    { t: 2.65, v: 116, e: easeOut },
    { t: 3.45, v: 84, e: inOut },
    { t: 4.0, v: 78, e: easeOut },
    { t: 4.45, v: 126, e: inOut },
    { t: 4.7, v: 120 },
    { t: 5, v: 82, e: inOut },
  ]),
  camZoom: track([
    { t: 0, v: 1.42 },
    { t: 1.0, v: 1.3, e: inOut },
    { t: 1.6, v: 1.42, e: inOut },
    { t: 2.3, v: 1.22, e: inOut },
    { t: 2.65, v: 1.36, e: easeOut },
    { t: 2.85, v: 1.24, e: easeOut },
    { t: 3.45, v: 1.3, e: inOut },
    { t: 4.0, v: 1.5, e: easeOut },
    { t: 4.45, v: 1.22, e: inOut },
    { t: 4.7, v: 1.28 },
    { t: 5, v: 1.14, e: inOut },
  ]),
  camRoll: track([
    { t: 1.5, v: 0 },
    { t: 2.1, v: -0.8, e: inOut },
    { t: 2.6, v: 0, e: inOut },
    { t: 2.7, v: -1.8, e: easeOut },
    { t: 3.1, v: 0.9, e: inOut },
    { t: 3.45, v: 0, e: inOut },
    { t: 4.3, v: 0 },
    { t: 4.45, v: 0.8, e: inOut },
    { t: 4.7, v: 0, e: inOut },
  ]),
  letterbox: track([
    { t: 0, v: 0 },
    { t: 0.35, v: 1, e: easeOut },
    { t: 4.82, v: 1 },
    { t: 5, v: 0, e: inOut },
  ]),
  cell: track([
    { t: 3.4, v: 0 },
    { t: 3.62, v: 1, e: backOut },
  ]),
};

const ENDING = {
  jonX: track([
    { t: 0, v: 237 },
    { t: 1.2, v: 237 },
    { t: 1.45, v: 229, e: easeOut },
    { t: 1.96, v: 216, e: inOut },
    { t: 3.0, v: 216 },
    { t: 4, v: 96, e: inOut },
  ]),
  jonY: track([
    { t: 0, v: 88 },
    { t: 1.2, v: 88 },
    { t: 1.3, v: 78, e: easeOut },
    { t: 1.96, v: 132, e: easeIn },
  ]),
  claudeX: track([
    { t: 0, v: 274 },
    { t: 1.0, v: 274 },
    { t: 1.3, v: 246, e: easeOut },
    { t: 1.55, v: 216, e: inOut },
    { t: 1.96, v: 190, e: inOut },
    { t: 3.0, v: 194 },
    { t: 4, v: 124, e: inOut },
  ]),
  claudeY: track([
    { t: 0, v: 70 },
    { t: 1.0, v: 70 },
    { t: 1.15, v: 58, e: easeOut },
    { t: 1.45, v: 84, e: inOut },
    { t: 1.96, v: 137, e: easeIn },
  ]),
  handX: track([
    { t: 2.0, v: 236 },
    { t: 3.0, v: 226, e: inOut },
  ]),
  handY: track([
    { t: 2.0, v: -100 },
    { t: 2.35, v: 36, e: easeOut },
    { t: 2.8, v: 36 },
    { t: 3.1, v: -110, e: easeIn },
  ]),
  camX: track([
    { t: 0, v: 262 },
    { t: 1.0, v: 266, e: inOut },
    { t: 1.35, v: 250, e: inOut },
    { t: 1.96, v: 222, e: inOut },
    { t: 2.4, v: 225, e: inOut },
    { t: 3.0, v: 205, e: inOut },
    { t: 4, v: 150, e: inOut },
  ]),
  camY: track([
    { t: 0, v: 72 },
    { t: 1.0, v: 70, e: inOut },
    { t: 1.4, v: 86, e: inOut },
    { t: 1.96, v: 122, e: inOut },
    { t: 2.45, v: 88, e: inOut },
    { t: 3.0, v: 120, e: inOut },
    { t: 4, v: 100, e: inOut },
  ]),
  camZoom: track([
    { t: 0, v: 1.5 },
    { t: 0.9, v: 1.68, e: easeIn },
    { t: 1.0, v: 1.82, e: easeOut },
    { t: 1.3, v: 1.4, e: inOut },
    { t: 1.96, v: 1.26, e: inOut },
    { t: 2.45, v: 1.18, e: inOut },
    { t: 3.0, v: 1.22, e: inOut },
    { t: 4, v: 1.12, e: inOut },
  ]),
  camRoll: track([
    { t: 1.0, v: 0 },
    { t: 1.08, v: 2.2, e: easeOut },
    { t: 1.5, v: -1.2, e: inOut },
    { t: 1.96, v: 0, e: inOut },
  ]),
  letterbox: track([
    { t: 0, v: 0 },
    { t: 0.3, v: 1, e: easeOut },
    { t: 3.88, v: 1 },
    { t: 4, v: 0.4, e: inOut },
  ]),
  wave: (t: number) => (t > 2.4 && t < 2.85 ? Math.sin((t - 2.4) * 46) * 13 : 0),
};

/**
 * The whole film as continuous curves of time (no rounding, no cuts), so a renderer can sample
 * it every display frame. Time `elapsed` is in ms; beats are STORY_BEAT_MS long.
 */
export function storyFrame(ending: boolean, elapsed: number): StoryFrame {
  const t = Math.max(0, elapsed) / STORY_BEAT_MS;
  const speed = (f: (t: number) => number) => Math.abs(f(t + 0.02) - f(t - 0.02)) / 0.04;
  const noOrb = { x: 0, y: 0, alpha: 0 };
  const noBubble = { x: 0, y: 0, a: 0 };
  if (ending) {
    const sliding = t >= 1.2 && t < 1.96;
    const walking = t >= 3 && speed(ENDING.jonX) > 6;
    const cam = clampCamera(ENDING.camX(t), ENDING.camY(t), ENDING.camZoom(t));
    // The rumble builds under the orbiting letters, then the lock bursts.
    const rumble = 3.2 * easeIn((t - 0.2) / 0.8) * (t < SHATTER_BEAT ? 1 : 0);
    const bob = walking ? Math.abs(Math.sin(elapsed / 85)) * 2 : Math.sin(elapsed / 420) * 0.5;
    const jonY = ENDING.jonY(t);
    return {
      jon: {
        x: ENDING.jonX(t),
        y: jonY + (sliding ? 0 : 0),
        state: t < 1.96 ? "jump" : walking ? "run" : "idle",
        bob: t < 1.96 ? 0 : bob,
      },
      claude: {
        x: ENDING.claudeX(t),
        y: ENDING.claudeY(t) + (t < 1.96 ? 0 : Math.sin(elapsed / 260) * 1.2),
        roll: sliding ? Math.sin(elapsed / 60) * 8 : 0,
      },
      hand: {
        x: ENDING.handX(t),
        y: ENDING.handY(t),
        visible: t >= 2.0 && t < 3.15,
        roll: ENDING.wave(t),
      },
      orb: noOrb,
      shadow: { x: 0, s: 0 },
      bubble: noBubble,
      camera: { ...cam, zoom: ENDING.camZoom(t), roll: ENDING.camRoll(t) },
      shake: rumble + 8 * decay(t, SHATTER_BEAT, 6) + (sliding ? 0.9 : 0) + 4 * decay(t, 1.96, 10),
      flash: 1 * decay(t, SHATTER_BEAT, 11) + 0.25 * decay(t, 1.96, 14),
      dark: 0,
      letterbox: ENDING.letterbox(t),
      cell: t < SHATTER_BEAT ? 1 : 0,
      cellBreak: ramp(t, SHATTER_BEAT, SHATTER_BEAT + 0.4),
      dawn: ramp(t, 2.0, 3.7) * 0.95 + ramp(t, 3.7, 4) * 0.05,
      sun: ramp(t, 2.9, 4),
      title: ramp(t, 3.55, 3.85),
    };
  }
  const jonRunning = t < 4.7 && speed(OPENING.jonX) > 6;
  const climbing = t >= 4.7;
  const claudeX = OPENING.claudeX(t);
  const carried = t >= GRAB_BEAT && t < 3.45;
  const cam = clampCamera(OPENING.camX(t), OPENING.camY(t), OPENING.camZoom(t));
  const alarmed = t >= 1.3 && t < 2.65;
  return {
    jon: {
      x: OPENING.jonX(t),
      y: climbing ? OPENING.jonY(t) : 132,
      state: climbing ? "jump" : jonRunning ? "run" : "idle",
      bob: jonRunning ? Math.abs(Math.sin(elapsed / 85)) * 2 : Math.sin(elapsed / 420) * 0.5,
    },
    claude: {
      x: claudeX,
      y:
        (t < 2.5 ? 137 : OPENING.claudeY(t)) +
        (t < 1.3 && t > 0.1 ? Math.abs(Math.sin(elapsed / 150)) * -1.6 : 0) +
        (alarmed ? Math.abs(Math.sin(elapsed / 90)) * -0.8 : 0) +
        (carried ? Math.sin(elapsed / 70) * 1.4 : Math.sin(elapsed / 260) * 1.0),
      roll: carried ? Math.sin(elapsed / 90) * 9 : 0,
    },
    hand: { x: claudeX, y: OPENING.handY(t), visible: t >= 2 && t < 3.5, roll: 0 },
    orb: {
      x: OPENING.orbX(t),
      y: OPENING.orbY(t) + Math.sin(elapsed / 240) * 3,
      alpha: t < 1.25 ? Math.min(1, t / 0.2) : Math.max(0, 1 - (t - 1.25) / 0.1),
    },
    shadow: { x: 114, s: ramp(t, 1.45, 2.6) * (t < 3.0 ? 1 : Math.max(0, 1 - (t - 3.0) / 0.25)) },
    bubble: {
      x: claudeX,
      y: 111,
      a: t >= 1.35 && t < 2.45 ? Math.min(1, (t - 1.35) / 0.06) : 0,
    },
    camera: { ...cam, zoom: OPENING.camZoom(t), roll: OPENING.camRoll(t) },
    shake:
      6 * decay(t, GRAB_BEAT, 7) +
      3 * decay(t, 3.45, 9) +
      // The ground trembles as the shadow grows.
      (t > 1.7 && t < 2.65 ? 0.7 * ramp(t, 1.7, 2.65) : 0),
    flash: 0.9 * decay(t, GRAB_BEAT, 16) + 0.18 * decay(t, 1.62, 18),
    dark: 0.38 * ramp(t, 1.35, 2.2) * (t < 3.0 ? 1 : Math.max(0, 1 - (t - 3.0) / 0.5)),
    letterbox: OPENING.letterbox(t),
    cell: OPENING.cell(t),
    cellBreak: 0,
    dawn: 0,
    sun: 0,
    title: 0,
  };
}

/** Cheap deterministic jitter in -1..1 for camera shake (a sum of unrelated sines). */
export function shakeNoise(ms: number, seed: number): number {
  return (Math.sin(ms * 0.093 + seed * 12.9898) + Math.sin(ms * 0.171 + seed * 78.233)) / 2;
}
