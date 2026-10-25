import { backOut, easeIn, easeOut, inOut, linear, track } from "./easing";

export const STORY_BEAT_MS = 3300;
export const OPENING_BEATS = [
  {
    speaker: "JON",
    title: "A light in the woods",
    text: "Claude and I followed a strange glow. Then the clouds began to move.",
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
    text: "You found every clue. I knew you’d come back.",
  },
  { speaker: "JON", title: "Together, down the beanstalk", text: "Stay close. We’re going home." },
  {
    speaker: "TOGETHER AGAIN",
    title: "No companion left behind",
    text: "Six small treasures opened the biggest door.",
  },
] as const;

/** Story stage size in "pixels" (the art is drawn on this grid, then scaled up). */
export const STAGE = { w: 320, h: 180 } as const;

/** When the giant's hand closes on Claude, in beats: the one moment the film freezes briefly. */
export const GRAB_BEAT = 1.65;
export const HIT_STOP_MS = 110;

/** True on the tick that carries the clock across the grab, so the renderer can freeze briefly. */
export function crossesGrab(ending: boolean, before: number, after: number): boolean {
  const at = GRAB_BEAT * STORY_BEAT_MS;
  return !ending && before < at && after >= at;
}

export interface StoryFrame {
  jon: { x: number; y: number; state: "idle" | "run" | "jump"; bob: number };
  claude: { x: number; y: number; roll: number };
  hand: { x: number; y: number; visible: boolean };
  /** Camera centre in stage units, zoom (1 = whole stage) and roll in degrees. */
  camera: { x: number; y: number; zoom: number; roll: number };
  /** Shake amplitude in stage units (the renderer turns it into jitter). */
  shake: number;
  /** 0..1 white flash. */
  flash: number;
  /** 0..1 cinema bars. */
  letterbox: number;
  /** 0..1 how far the cell bars have slammed in. */
  cell: number;
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

const OPENING = {
  jonX: track([
    { t: 0, v: 46 },
    { t: 1, v: 78, e: linear },
    { t: 1.65, v: 92, e: easeOut },
    { t: 2.45, v: 142, e: inOut },
    { t: 3.0, v: 142 },
    { t: 3.7, v: 221, e: inOut },
  ]),
  jonY: track([
    { t: 3.7, v: 132 },
    { t: 3.82, v: 106, e: easeOut },
    { t: 4, v: 89, e: inOut },
  ]),
  claudeX: track([
    { t: 0, v: 76 },
    { t: 1, v: 106, e: linear },
    { t: 1.65, v: 110, e: easeOut },
    { t: 2.45, v: 274, e: inOut },
  ]),
  claudeY: track([
    { t: 1.5, v: 137 },
    { t: 1.65, v: 130, e: easeOut },
    { t: 1.95, v: 96, e: easeOut },
    { t: 2.45, v: 70, e: backOut },
  ]),
  handY: track([
    { t: 1, v: -100 },
    { t: 1.65, v: 108, e: easeIn },
    { t: 2.45, v: -100, e: inOut },
  ]),
  camX: track([
    { t: 0, v: 96 },
    { t: 1.45, v: 106, e: inOut },
    { t: 1.65, v: 108 },
    { t: 2.45, v: 240, e: inOut },
    { t: 3.0, v: 248, e: easeOut },
    { t: 3.45, v: 150, e: inOut },
    { t: 3.7, v: 205, e: inOut },
    { t: 4, v: 236, e: inOut },
  ]),
  camY: track([
    { t: 0, v: 122 },
    { t: 1.4, v: 104, e: inOut },
    { t: 1.65, v: 116, e: easeOut },
    { t: 2.45, v: 84, e: inOut },
    { t: 3.0, v: 78, e: easeOut },
    { t: 3.45, v: 126, e: inOut },
    { t: 3.7, v: 120 },
    { t: 4, v: 82, e: inOut },
  ]),
  camZoom: track([
    { t: 0, v: 1.42 },
    { t: 1.4, v: 1.25, e: inOut },
    { t: 1.65, v: 1.36, e: easeOut },
    { t: 1.85, v: 1.24, e: easeOut },
    { t: 2.45, v: 1.3, e: inOut },
    { t: 3.0, v: 1.5, e: easeOut },
    { t: 3.45, v: 1.22, e: inOut },
    { t: 3.7, v: 1.28 },
    { t: 4, v: 1.14, e: inOut },
  ]),
  camRoll: track([
    { t: 1.6, v: 0 },
    { t: 1.7, v: -1.8, e: easeOut },
    { t: 2.1, v: 0.9, e: inOut },
    { t: 2.45, v: 0, e: inOut },
    { t: 3.3, v: 0 },
    { t: 3.45, v: 0.8, e: inOut },
    { t: 3.7, v: 0, e: inOut },
  ]),
  letterbox: track([
    { t: 0, v: 0 },
    { t: 0.35, v: 1, e: easeOut },
    { t: 3.82, v: 1 },
    { t: 4, v: 0, e: inOut },
  ]),
  cell: track([
    { t: 2.4, v: 0 },
    { t: 2.62, v: 1, e: backOut },
  ]),
};

const ENDING = {
  jonX: track([
    { t: 1, v: 237 },
    { t: 2, v: 180, e: inOut },
    { t: 3, v: 95, e: inOut },
  ]),
  jonY: track([
    { t: 1, v: 88 },
    { t: 2, v: 132, e: inOut },
  ]),
  claudeX: track([
    { t: 1, v: 274 },
    { t: 2, v: 208, e: inOut },
    { t: 3, v: 125, e: inOut },
  ]),
  claudeY: track([
    { t: 1, v: 70 },
    { t: 2, v: 137, e: inOut },
  ]),
  camX: track([
    { t: 0, v: 252 },
    { t: 1, v: 246, e: inOut },
    { t: 2, v: 205, e: inOut },
    { t: 3, v: 150, e: inOut },
  ]),
  camY: track([
    { t: 0, v: 78 },
    { t: 1, v: 86, e: inOut },
    { t: 2, v: 118, e: inOut },
    { t: 3, v: 124, e: inOut },
  ]),
  camZoom: track([
    { t: 0, v: 1.5 },
    { t: 1, v: 1.32, e: inOut },
    { t: 2, v: 1.22, e: inOut },
    { t: 3, v: 1.12, e: inOut },
  ]),
  letterbox: track([
    { t: 0, v: 0 },
    { t: 0.3, v: 1, e: easeOut },
    { t: 2.82, v: 1 },
    { t: 3, v: 0, e: inOut },
  ]),
};

/**
 * The whole film as continuous curves of time (no rounding, no cuts), so a renderer can sample
 * it every display frame. Time `elapsed` is in ms; beats are STORY_BEAT_MS long.
 */
export function storyFrame(ending: boolean, elapsed: number): StoryFrame {
  const t = Math.max(0, elapsed) / STORY_BEAT_MS;
  const speed = (f: (t: number) => number) => Math.abs(f(t + 0.02) - f(t - 0.02)) / 0.04;
  if (ending) {
    const x = ENDING.jonX(t);
    const descending = t >= 1 && t < 2;
    const walking = t >= 2 && speed(ENDING.jonX) > 6;
    const cam = clampCamera(ENDING.camX(t), ENDING.camY(t), ENDING.camZoom(t));
    return {
      jon: {
        x,
        y: t < 1 ? 88 : ENDING.jonY(t),
        state: descending ? "jump" : walking ? "run" : "idle",
        bob: walking ? Math.abs(Math.sin(elapsed / 85)) * 2 : Math.sin(elapsed / 420) * 0.5,
      },
      claude: {
        x: ENDING.claudeX(t),
        y: (t < 1 ? 70 : ENDING.claudeY(t)) + Math.sin(elapsed / 260) * 1.2,
        roll: 0,
      },
      hand: { x: 274, y: -100, visible: false },
      camera: { ...cam, zoom: ENDING.camZoom(t), roll: 0 },
      shake: 0,
      flash: 0.7 * decay(t, 0, 9),
      letterbox: ENDING.letterbox(t),
      cell: 0,
    };
  }
  const jonRunning = t < 3.7 && speed(OPENING.jonX) > 6;
  const climbing = t >= 3.7;
  const claudeX = OPENING.claudeX(t);
  const carried = t >= GRAB_BEAT && t < 2.45;
  const cam = clampCamera(OPENING.camX(t), OPENING.camY(t), OPENING.camZoom(t));
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
        (t < 1.5 ? 137 : OPENING.claudeY(t)) +
        (t < 2.45 && !carried ? Math.abs(Math.sin(elapsed / 150)) * -1.6 : 0) +
        (carried ? Math.sin(elapsed / 70) * 1.4 : Math.sin(elapsed / 260) * 1.0),
      roll: carried ? Math.sin(elapsed / 90) * 9 : 0,
    },
    hand: { x: claudeX, y: OPENING.handY(t), visible: t >= 1 && t < 2.5 },
    camera: {
      ...cam,
      zoom: OPENING.camZoom(t),
      roll: OPENING.camRoll(t),
    },
    shake: 6 * decay(t, GRAB_BEAT, 7) + 3 * decay(t, 2.45, 9),
    flash: 0.9 * decay(t, GRAB_BEAT, 16),
    letterbox: OPENING.letterbox(t),
    cell: OPENING.cell(t),
  };
}

/** Cheap deterministic jitter in -1..1 for camera shake (a sum of unrelated sines). */
export function shakeNoise(ms: number, seed: number): number {
  return (Math.sin(ms * 0.093 + seed * 12.9898) + Math.sin(ms * 0.171 + seed * 78.233)) / 2;
}
