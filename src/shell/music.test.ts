import { describe, expect, it } from "vitest";
import { MUSIC_THEMES, musicNotes } from "./music";
import { OBSTACLE_CUES, OBSTACLE_SOUNDS } from "./obstacle-sounds";
import { ATTACKS } from "../game/saboteur/attacks";
describe("magical stage score", () => {
  it("accelerates in every successive stage and has six different melodies", () => {
    MUSIC_THEMES.forEach((theme, i) => {
      if (i) expect(theme.step).toBeLessThan(MUSIC_THEMES[i - 1].step);
    });
    expect(new Set(MUSIC_THEMES.map((t) => t.tune.join(","))).size).toBe(6);
  });
  it("keeps layered notes within sensible pitches and levels", () => {
    MUSIC_THEMES.forEach((_, stage) => {
      for (let beat = 0; beat < 32; beat++)
        for (const note of musicNotes(stage, beat)) {
          expect(note.midi).toBeGreaterThan(20);
          expect(note.midi).toBeLessThan(110);
          expect(note.volume).toBeGreaterThan(0);
          expect(note.volume).toBeLessThanOrEqual(0.05);
        }
    });
  });
});
describe("obstacle sound identities", () => {
  it("assigns every giant and natural obstacle a distinct sound", () => {
    const kinds = [...ATTACKS.map((a) => a.id), "wild-thorns", "moss-rock", "sticky-sap"];
    const cues = kinds.map((kind) => OBSTACLE_CUES[kind as keyof typeof OBSTACLE_CUES]);
    expect(cues.every(Boolean)).toBe(true);
    expect(new Set(cues).size).toBe(kinds.length);
  });
  it("uses a short high-frequency shatter for broken shields", () => {
    const glass = OBSTACLE_SOUNDS.glass;
    expect(Math.min(...glass.notes)).toBeGreaterThan(1500);
    expect(glass.step * (glass.notes.length - 1) + glass.duration).toBeLessThan(0.2);
  });
});
