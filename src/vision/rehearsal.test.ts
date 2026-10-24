import { expect, it } from "vitest";
import { parseRecording, rehearsalFrames } from "./rehearsal";
import { createInterpreter } from "./interpreter";
import { CircleDetector } from "./gestures/circle";
import type { InputEvent } from "../shared/input";

it("replays the synthetic demo through the real interpreter, with one fire for a held fist", () => {
  const events: InputEvent[] = [];
  const circles: string[] = [];
  const interpret = createInterpreter((e) => events.push(e));
  const circle = new CircleDetector();
  const frames = parseRecording(JSON.stringify(rehearsalFrames()));
  for (const frame of frames) {
    interpret(frame);
    if (frame.player === "runner") {
      const result = circle.push(frame.t, frame.landmarks?.[9] ?? null);
      if (result) circles.push(result);
    }
  }
  expect(events.filter((e) => e.action === "fire")).toHaveLength(1);
  expect(events.filter((e) => e.action === "select")).toEqual(
    [0, 1, 2].map((slot) => ({ player: "saboteur", action: "select", slot })),
  );
  expect(events.some((e) => e.action === "jump")).toBe(true);
  expect(circles).toEqual(["clockwise"]);
});
it("rejects malformed and out-of-order recordings", () => {
  expect(() => parseRecording("{}")).toThrow();
  expect(() =>
    parseRecording('[{"player":"runner","t":0,"landmarks":[],"gesture":null}]'),
  ).toThrow();
  expect(() => parseRecording(JSON.stringify(rehearsalFrames().reverse()))).toThrow();
});
