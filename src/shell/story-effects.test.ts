import { describe, expect, it } from "vitest";
import { sampleBursts, SPELL, spellLetters, storyParticles, storyRings } from "./story-effects";
import { SHATTER_BEAT, STORY_BEAT_MS } from "./story-timeline";

/** Beat time for `sec` seconds after the test burst starts at beat 1. */
const at = (sec: number) => 1 + (sec * 1000) / STORY_BEAT_MS;

describe("story effects", () => {
  const burst = {
    t0: 1,
    x: 100,
    y: 50,
    n: 8,
    speed: 40,
    life: 1,
    colors: ["#fff", "#f00"],
    gravity: 100,
  };
  it("emit nothing before or after their life, and fade out", () => {
    expect(sampleBursts([burst], at(-0.05))).toEqual([]);
    expect(sampleBursts([burst], at(5))).toEqual([]);
    const early = sampleBursts([burst], at(0.05));
    const late = sampleBursts([burst], at(0.9));
    expect(early).toHaveLength(8);
    expect(early[0].alpha).toBeGreaterThan(late[0].alpha);
    expect(late[0].alpha).toBeGreaterThanOrEqual(0);
  });
  it("spread from the origin, with gravity pulling the pack down", () => {
    const a = sampleBursts([burst], at(0.1));
    const b = sampleBursts([burst], at(0.6));
    const meanY = (ps: typeof a) => ps.reduce((s, p) => s + p.y, 0) / ps.length;
    expect(meanY(b)).toBeGreaterThan(meanY(a));
    const far = Math.max(...b.map((p) => Math.hypot(p.x - 100, p.y - 50)));
    const near = Math.max(...a.map((p) => Math.hypot(p.x - 100, p.y - 50)));
    expect(far).toBeGreaterThan(near);
  });
  it("is deterministic and stays inside a sane pool for the whole film", () => {
    expect(storyParticles(true, 1.3)).toEqual(storyParticles(true, 1.3));
    for (const ending of [false, true])
      for (let t = 0; t <= 5; t += 0.02) {
        expect(storyParticles(ending, t).length).toBeLessThanOrEqual(150);
        for (const r of storyRings(ending, t)) {
          expect(r.alpha).toBeGreaterThanOrEqual(0);
          expect(r.alpha).toBeLessThanOrEqual(1);
        }
      }
  });
  it("bursts the shatter and the fireworks at the scripted beats", () => {
    expect(storyParticles(true, SHATTER_BEAT - 0.05).filter((p) => p.y < 90)).toHaveLength(0);
    expect(storyParticles(true, SHATTER_BEAT + 0.05).length).toBeGreaterThan(40);
    expect(storyRings(true, SHATTER_BEAT + 0.05).length).toBeGreaterThanOrEqual(2);
    expect(storyParticles(true, 3.5).length).toBeGreaterThan(40);
  });
});

describe("spell letters", () => {
  it("orbit the cell, tighten, then vanish at the shatter; absent in the opening", () => {
    expect(spellLetters(false, 0.5)).toEqual([]);
    expect(spellLetters(true, 0.01)).toEqual([]);
    expect(spellLetters(true, SHATTER_BEAT)).toEqual([]);
    const wide = spellLetters(true, 0.4);
    const tight = spellLetters(true, 0.97);
    expect(wide.map((l) => l.ch).join("")).toBe(SPELL);
    const spread = (ls: typeof wide) =>
      Math.max(...ls.map((l) => Math.hypot(l.x - 274, (l.y - 66) / 0.7)));
    expect(spread(wide)).toBeGreaterThan(spread(tight) * 2);
  });
});
