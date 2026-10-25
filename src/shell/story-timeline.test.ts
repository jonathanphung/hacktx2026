import { describe, expect, it } from "vitest";
import { backOut, easeOut, inOut, track } from "./easing";
import {
  clampCamera,
  crossesGrab,
  ENDING_BEATS,
  GRAB_BEAT,
  OPENING_BEATS,
  STAGE,
  STORY_BEAT_MS,
  storyFrame,
} from "./story-timeline";

const total = (ending: boolean) => STORY_BEAT_MS * (ending ? ENDING_BEATS : OPENING_BEATS).length;

describe("easing and tracks", () => {
  it("start at 0, end at 1, and never go backwards (except the deliberate overshoot)", () => {
    for (const ease of [inOut, easeOut]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      let last = 0;
      for (let t = 0; t <= 1; t += 0.01) {
        expect(ease(t)).toBeGreaterThanOrEqual(last - 1e-9);
        last = ease(t);
      }
    }
    expect(backOut(1)).toBeCloseTo(1);
    expect(Math.max(...[...Array(101)].map((_, i) => backOut(i / 100)))).toBeGreaterThan(1);
  });
  it("holds the ends and interpolates between keys", () => {
    const f = track([
      { t: 1, v: 10 },
      { t: 2, v: 20 },
    ]);
    expect(f(0)).toBe(10);
    expect(f(3)).toBe(20);
    expect(f(1.5)).toBeCloseTo(15);
  });
});

describe("the film is continuous, bounded and framed", () => {
  it("never teleports: actors and camera move smoothly from one display frame to the next", () => {
    for (const ending of [false, true]) {
      let before = storyFrame(ending, 0);
      for (let t = 16; t < total(ending); t += 16) {
        const now = storyFrame(ending, t);
        for (const key of ["jon", "claude"] as const) {
          // 16 ms at the fastest scripted motion is a few stage pixels, never a jump.
          expect(Math.abs(now[key].x - before[key].x)).toBeLessThan(9);
        }
        // The hand moves quickly on the grab and the carry, but still continuously.
        expect(Math.abs(now.hand.y - before.hand.y)).toBeLessThan(28);
        expect(Math.abs(now.camera.zoom - before.camera.zoom)).toBeLessThan(0.05);
        expect(Math.abs(now.camera.x - before.camera.x)).toBeLessThan(10);
        before = now;
      }
    }
  });
  it("uses sub-pixel positions rather than snapping to the pixel grid", () => {
    const xs = new Set<number>();
    for (let t = 0; t < 2500; t += 16) xs.add(storyFrame(false, t).jon.x % 1 === 0 ? 0 : 1);
    expect(xs.has(1)).toBe(true);
  });
  it("keeps actors on stage and the camera inside the painted stage at every moment", () => {
    for (const ending of [false, true])
      for (let t = 0; t <= total(ending); t += 16) {
        const f = storyFrame(ending, t);
        for (const actor of [f.jon, f.claude]) {
          expect(actor.x).toBeGreaterThanOrEqual(0);
          expect(actor.x).toBeLessThanOrEqual(STAGE.w);
          expect(actor.y).toBeGreaterThanOrEqual(0);
          expect(actor.y).toBeLessThanOrEqual(STAGE.h);
        }
        const { x, y, zoom } = f.camera;
        expect(zoom).toBeGreaterThanOrEqual(1.1);
        expect(clampCamera(x, y, zoom)).toEqual({ x, y });
        for (const v of [f.flash, f.letterbox, f.cell]) {
          expect(v).toBeGreaterThanOrEqual(-0.001);
          expect(v).toBeLessThanOrEqual(1.25);
        }
      }
  });
  it("opens and closes the cinema bars", () => {
    for (const ending of [false, true]) {
      expect(storyFrame(ending, 0).letterbox).toBe(0);
      expect(storyFrame(ending, total(ending) / 2).letterbox).toBe(1);
      expect(storyFrame(ending, total(ending)).letterbox).toBe(0);
    }
  });
});

describe("opening beats", () => {
  it("lands the grab with a flash and shake, and nothing before it", () => {
    const at = GRAB_BEAT * STORY_BEAT_MS;
    expect(storyFrame(false, at - 50).flash).toBeLessThan(0.01);
    expect(storyFrame(false, at - 50).shake).toBeLessThan(0.01);
    expect(storyFrame(false, at + 20).flash).toBeGreaterThan(0.5);
    expect(storyFrame(false, at + 20).shake).toBeGreaterThan(3);
    expect(storyFrame(false, at + 1500).flash).toBeLessThan(0.01);
  });
  it("freezes only on the tick that crosses the grab, and only in the opening", () => {
    const at = GRAB_BEAT * STORY_BEAT_MS;
    expect(crossesGrab(false, at - 5, at + 5)).toBe(true);
    expect(crossesGrab(false, at + 5, at + 20)).toBe(false);
    expect(crossesGrab(false, at - 30, at - 10)).toBe(false);
    expect(crossesGrab(true, at - 5, at + 5)).toBe(false);
  });
  it("captures Claude in the tower, slams the cell bars shut and ends with Jon climbing", () => {
    const end = storyFrame(false, total(false));
    expect(end.claude.x).toBeCloseTo(274, 0);
    expect(end.claude.y).toBeLessThan(75);
    expect(end.cell).toBe(1);
    expect(end.jon.state).toBe("jump");
    expect(end.jon.y).toBeCloseTo(89, 0);
    expect(storyFrame(false, 2.2 * STORY_BEAT_MS).cell).toBe(0);
  });
  it("only runs when Jon is actually moving", () => {
    expect(storyFrame(false, 3.01 * STORY_BEAT_MS).jon.state).toBe("idle");
    expect(storyFrame(false, 3.5 * STORY_BEAT_MS).jon.state).toBe("run");
    expect(storyFrame(false, 0.5 * STORY_BEAT_MS).jon.state).toBe("run");
  });
});

describe("ending beats", () => {
  it("brings both companions down and home, with the bars gone", () => {
    const end = storyFrame(true, total(true));
    expect(end.claude.y).toBeGreaterThan(135);
    expect(end.jon.y).toBeGreaterThan(130);
    expect(end.cell).toBe(0);
    expect(end.claude.x).toBeLessThan(180);
    expect(end.jon.x).toBeLessThan(180);
    expect(storyFrame(true, 1.5 * STORY_BEAT_MS).jon.state).toBe("jump");
  });
});
