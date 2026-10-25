import { expect, it } from "vitest";
import { ENDING_BEATS, OPENING_BEATS, STORY_BEAT_MS, storyPose } from "./story-timeline";
it("keeps actors on a fixed pixel grid through opening and ending, with no unbounded camera motion", () => {
  for (const ending of [false, true])
    for (let time = 0; time < 20000; time += 33) {
      const pose = storyPose(ending, time);
      for (const actor of [pose.jon, pose.claude]) {
        expect(Number.isInteger(actor.x) && Number.isInteger(actor.y)).toBe(true);
        expect(actor.x).toBeGreaterThanOrEqual(0);
        expect(actor.x).toBeLessThanOrEqual(320);
        expect(actor.y).toBeGreaterThanOrEqual(0);
        expect(actor.y).toBeLessThanOrEqual(180);
      }
    }
});
it("captures Claude before the climb and brings both companions home in the ending", () => {
  const opening = storyPose(false, STORY_BEAT_MS * OPENING_BEATS.length);
  expect(opening.claude).toEqual({ x: 274, y: 70 });
  expect(opening.bars).toBe(true);
  expect(opening.climbing).toBe(true);
  const ending = storyPose(true, STORY_BEAT_MS * ENDING_BEATS.length);
  expect(ending.claude.y).toBe(137);
  expect(ending.jon.y).toBe(132);
  expect(ending.bars).toBe(false);
  expect(ending.claude.x).toBeLessThan(180);
  expect(ending.jon.x).toBeLessThan(180);
});
