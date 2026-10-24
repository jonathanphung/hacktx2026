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

it("maps a calibrated comfortable reach to left and right aim", () => {
  const events: InputEvent[] = [];
  const interpret = createInterpreter(
    (e) => events.push(e),
    () => ({ version: 1, swipeDistance: 0.2, aim: { minX: 0.25, maxX: 0.75 } }),
  );
  interpret(frame(0, "Open_Palm", 0.3));
  interpret(frame(200, "Open_Palm", 0.7));
  expect(events.filter((e) => e.action === "aim")).toEqual([
    { player: "saboteur", action: "aim", lane: 0 },
    { player: "saboteur", action: "aim", lane: 2 },
  ]);
});
it("recognizes small strokes only when the player chooses that sensitivity", () => {
  for (const distance of [0.14, 0.2]) {
    const events: InputEvent[] = [];
    const settings = { version: 1 as const, swipeDistance: distance, aim: { minX: 0, maxX: 1 } };
    const interpret = createInterpreter(
      (e) => events.push(e),
      () => settings,
    );
    for (let t = 0; t <= 240; t += 30)
      interpret({
        ...frame(t, null),
        player: "runner",
        landmarks: Array.from({ length: 21 }, () => ({ x: 0.3 + (t / 240) * 0.18, y: 0.5 })),
      });
    expect(events).toHaveLength(distance === 0.14 ? 1 : 0);
  }
});
it("does not bridge buffered motion across a settings change", () => {
  const events: InputEvent[] = [];
  let settings = { version: 1 as const, swipeDistance: 0.2, aim: { minX: 0, maxX: 1 } };
  const interpret = createInterpreter(
    (e) => events.push(e),
    () => settings,
  );
  const push = (t: number, x: number) => interpret({ ...frame(t, null, x), player: "runner" });
  push(0, 0.8);
  push(40, 0.7);
  push(80, 0.65);
  settings = { ...settings, swipeDistance: 0.14 };
  push(120, 0.4);
  push(160, 0.4);
  push(200, 0.4);
  expect(events).toEqual([]);
});

it("keeps a held fist disarmed when sensitivity changes", () => {
  const events: InputEvent[] = [];
  let settings = { version: 1 as const, swipeDistance: 0.2, aim: { minX: 0, maxX: 1 } };
  const interpret = createInterpreter(
    (e) => events.push(e),
    () => settings,
  );
  for (let t = 0; t <= 200; t += 40) interpret(frame(t, "Closed_Fist"));
  settings = { ...settings, swipeDistance: 0.14 };
  for (let t = 240; t <= 500; t += 40) interpret(frame(t, "Closed_Fist"));
  expect(events.filter((e) => e.action === "fire")).toHaveLength(1);
});

it("dispatches a clear swipe directly at the threshold without an extra smoothing frame", () => {
  const events: InputEvent[] = [];
  const interpret = createInterpreter((event) => events.push(event));
  for (const [t, x] of [
    [0, 0.8],
    [35, 0.69],
    [70, 0.58],
  ])
    interpret({ ...frame(t, null, x), player: "runner" });
  expect(events).toEqual([{ player: "runner", action: "left" }]);
});

it("rearms from an uncertain but visibly extended hand between fist shots", () => {
  const events: InputEvent[] = [];
  const interpret = createInterpreter((event) => events.push(event));
  const open = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.8 }));
  for (const base of [5, 9, 13, 17]) {
    const x = 0.3 + base / 100;
    open[base] = { x, y: 0.6 };
    open[base + 1] = { x, y: 0.45 };
    open[base + 2] = { x, y: 0.3 };
    open[base + 3] = { x, y: 0.15 };
  }
  for (let t = 0; t <= 160; t += 40) interpret(frame(t, "Closed_Fist"));
  for (let t = 200; t <= 400; t += 40) interpret({ ...frame(t, null), landmarks: open });
  expect(events.filter((event) => event.action === "fire")).toHaveLength(1);
  for (let t = 440; t <= 640; t += 40) interpret(frame(t, "Closed_Fist"));
  expect(events.filter((event) => event.action === "fire")).toHaveLength(2);
});
