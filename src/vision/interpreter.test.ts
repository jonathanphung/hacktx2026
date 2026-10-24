import { expect, it } from "vitest";
import type { InputEvent } from "../shared/input";
import type { HandFrame } from "../shared/vision";
import { createInterpreter } from "./interpreter";

function frame(t: number, gesture: string | null, x = 0.5): HandFrame {
  return {
    player: "saboteur",
    t,
    gesture,
    landmarks: Array.from({ length: 21 }, () => ({ x, y: 0.5 })),
  };
}
it("selects slots directly, holds once, releases, then fires", () => {
  const events: InputEvent[] = [];
  const interpret = createInterpreter((e) => events.push(e));
  for (const [start, pose] of [
    [0, "Victory"],
    [400, "Open_Palm"],
    [800, "Closed_Fist"],
  ] as const)
    for (let t = start; t < start + 400; t += 40) interpret(frame(t, pose));
  expect(events).toEqual([
    { player: "saboteur", action: "select", slot: 1 },
    { player: "saboteur", action: "fire" },
  ]);
});
it("maps all three card poses to explicit slots", () => {
  for (const [slot, pose] of ["Pointing_Up", "Victory", "Thumb_Up"].entries()) {
    const events: InputEvent[] = [];
    const interpret = createInterpreter((e) => events.push(e));
    for (let t = 0; t < 300; t += 40) interpret(frame(t, pose));
    expect(events).toEqual([{ player: "saboteur", action: "select", slot }]);
  }
});
it("never emits an unsupported down action", () => {
  const events: InputEvent[] = [];
  const interpret = createInterpreter((e) => events.push(e));
  for (let t = 0; t <= 240; t += 30)
    interpret({
      ...frame(t, null),
      player: "runner",
      landmarks: Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.2 + t / 500 })),
    });
  expect(events).toEqual([]);
});
