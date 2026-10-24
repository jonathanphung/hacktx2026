import { describe, expect, it } from "vitest";
import type { InputEvent } from "../shared/input";
import type { HandFrame } from "../shared/vision";
import { pointingHand } from "./gestures/test-hands";
import { createInterpreter } from "./interpreter";

function frame(t: number, gesture: string | null, x = 0.5): HandFrame {
  return {
    player: "saboteur",
    t,
    gesture,
    landmarks: Array.from({ length: 21 }, () => ({ x, y: 0.5 })),
  };
}
function palmAt(t: number, gesture: string | null, x: number, y = 0.5): HandFrame {
  return {
    player: "saboteur",
    t,
    gesture,
    landmarks: Array.from({ length: 21 }, () => ({ x, y })),
  };
}
it("fires once per fist and re-arms after the hand opens", () => {
  const events: InputEvent[] = [];
  const interpret = createInterpreter((e) => events.push(e));
  for (const [start, pose] of [
    [0, "Open_Palm"],
    [400, "Closed_Fist"],
    [800, "Open_Palm"],
    [1200, "Closed_Fist"],
  ] as const)
    for (let t = start; t < start + 400; t += 40) interpret(frame(t, pose));
  expect(events.filter((e) => e.action === "fire")).toHaveLength(2);
});
it("locks the target lane while the fist closes, then resumes aiming when the hand opens", () => {
  const events: InputEvent[] = [];
  const settings = { version: 1 as const, swipeDistance: 0.2, aim: { minX: 0, maxX: 1 } };
  const interpret = createInterpreter(
    (e) => events.push(e),
    () => settings,
  );
  for (let t = 0; t < 400; t += 40) interpret(palmAt(t, "Open_Palm", 0.6));
  // Palm slides into lane 2 as the fingers curl; the fist is then recognized there.
  for (let t = 400; t < 800; t += 40) interpret(palmAt(t, t < 480 ? null : "Closed_Fist", 0.76));
  const aims = events.filter((e) => e.action === "aim");
  expect(aims.at(-1)).toEqual({ player: "saboteur", action: "aim", lane: 1 });
  expect(events.at(-1)).toEqual({ player: "saboteur", action: "fire" });
  expect(events.slice(events.findIndex((e) => e.action === "fire") + 1)).toEqual([]);
  interpret(palmAt(800, "Open_Palm", 0.76));
  interpret(palmAt(840, "Open_Palm", 0.76));
  expect(events.filter((e) => e.action === "aim").at(-1)).toEqual({
    player: "saboteur",
    action: "aim",
    lane: 2,
  });
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

describe("flexible directional input", () => {
  const settings = { version: 1 as const, swipeDistance: 0.2, aim: { minX: 0, maxX: 1 } };
  const make = () => {
    const events: InputEvent[] = [];
    const interpret = createInterpreter(
      (e) => events.push(e),
      () => settings,
    );
    return { events, interpret };
  };
  const hand = (player: "runner" | "saboteur", t: number, x: number, y = 0.5): HandFrame => ({
    player,
    t,
    gesture: "Open_Palm",
    landmarks: Array.from({ length: 21 }, () => ({ x, y })),
  });
  const pointAt = (player: "runner" | "saboteur", t: number, dir: "left" | "right" | "up") => ({
    player,
    t,
    gesture: "Pointing_Up",
    landmarks: pointingHand(dir),
  });
  const aims = (events: InputEvent[]) =>
    events.flatMap((e) => (e.action === "aim" ? [e.lane] : []));

  it("moves the runner by pointing, leaning the hand, or swiping", () => {
    const point = make();
    for (let t = 0; t <= 400; t += 33) point.interpret(pointAt("runner", t, "left"));
    expect(point.events).toEqual([{ player: "runner", action: "left" }]);
    const up = make();
    for (let t = 0; t <= 400; t += 33) up.interpret(pointAt("runner", t, "up"));
    expect(up.events).toEqual([{ player: "runner", action: "jump" }]);
    const lean = make();
    for (let t = 0; t <= 300; t += 33) lean.interpret(hand("runner", t, 0.5));
    for (let t = 333; t <= 900; t += 33) lean.interpret(hand("runner", t, 0.9));
    expect(lean.events).toEqual([{ player: "runner", action: "right" }]);
  });
  it("does not double-fire when a swipe leaves the hand at the edge", () => {
    const { events, interpret } = make();
    for (let t = 0; t <= 300; t += 33) interpret(hand("runner", t, 0.5));
    for (let t = 333; t <= 500; t += 33)
      interpret(hand("runner", t, 0.5 - ((t - 333) / 167) * 0.35));
    for (let t = 533; t <= 1500; t += 33) interpret(hand("runner", t, 0.15));
    expect(events).toEqual([{ player: "runner", action: "left" }]);
  });
  it("steps the saboteur's aim with a swipe and keeps it there while the hand rests", () => {
    const { events, interpret } = make();
    for (let t = 0; t <= 300; t += 33) interpret(hand("saboteur", t, 0.12));
    expect(aims(events).at(-1)).toBe(0);
    // Quick swipe right that stays inside the left zone: position alone would say lane 0.
    for (let t = 333; t <= 500; t += 33)
      interpret(hand("saboteur", t, 0.02 + ((t - 333) / 167) * 0.2));
    for (let t = 533; t <= 1300; t += 33) interpret(hand("saboteur", t, 0.22));
    expect(aims(events).at(-1)).toBe(1);
  });
  it("lets a fast slide across lanes land where the hand went, not one step short", () => {
    const { events, interpret } = make();
    for (let t = 0; t <= 300; t += 33) interpret(hand("saboteur", t, 0.15));
    for (let t = 333; t <= 500; t += 33)
      interpret(hand("saboteur", t, 0.15 + ((t - 333) / 167) * 0.7));
    for (let t = 533; t <= 1000; t += 33) interpret(hand("saboteur", t, 0.85));
    expect(aims(events).at(-1)).toBe(2);
  });
  it("steps the saboteur's aim by pointing left or right", () => {
    const { events, interpret } = make();
    for (let t = 0; t <= 300; t += 33) interpret(hand("saboteur", t, 0.5));
    for (let t = 333; t <= 800; t += 33) interpret(pointAt("saboteur", t, "right"));
    expect(aims(events).at(-1)).toBe(2);
    for (let t = 833; t <= 1100; t += 33) interpret(hand("saboteur", t, 0.5));
  });
  it("still fires with a fist after stepping", () => {
    const { events, interpret } = make();
    for (let t = 0; t <= 300; t += 33) interpret(hand("saboteur", t, 0.5));
    for (let t = 333; t <= 800; t += 33) interpret(pointAt("saboteur", t, "left"));
    for (let t = 833; t <= 1100; t += 33)
      interpret({ ...hand("saboteur", t, 0.5), gesture: "Closed_Fist" });
    expect(events.filter((e) => e.action === "fire")).toHaveLength(1);
    expect(aims(events).at(-1)).toBe(0);
  });
  it("does not read the hand coming back after a swipe as a swipe the other way", () => {
    const { events, interpret } = make();
    for (let t = 0; t <= 300; t += 33) interpret(hand("runner", t, 0.6));
    for (let t = 333; t <= 533; t += 33)
      interpret(hand("runner", t, 0.6 - ((t - 333) / 200) * 0.3));
    for (let t = 566; t <= 800; t += 33) interpret(hand("runner", t, 0.3));
    for (let t = 833; t <= 1300; t += 33)
      interpret(hand("runner", t, 0.3 + ((t - 833) / 467) * 0.3));
    for (let t = 1333; t <= 2200; t += 33) interpret(hand("runner", t, 0.6));
    expect(events).toEqual([{ player: "runner", action: "left" }]);
  });
});

describe("hand dropouts during fast motion", () => {
  const settings = { version: 1 as const, swipeDistance: 0.2, aim: { minX: 0, maxX: 1 } };
  const run = (player: "runner" | "saboteur", frames: [number, number | null, string?][]) => {
    const events: InputEvent[] = [];
    const interpret = createInterpreter(
      (e) => events.push(e),
      () => settings,
    );
    for (const [t, x, gesture] of frames)
      interpret({
        player,
        t,
        gesture: gesture ?? "Open_Palm",
        landmarks: x === null ? null : Array.from({ length: 21 }, () => ({ x, y: 0.5 })),
      });
    return events;
  };
  const rest = (from: number, to: number, x: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let t = from; t <= to; t += 33) out.push([t, x]);
    return out;
  };

  it("still recognizes a fast swipe when the tracker loses the hand mid-stroke", () => {
    const events = run("runner", [
      ...rest(0, 300, 0.7),
      [333, 0.62],
      [366, null],
      [399, null],
      [432, 0.3],
      ...rest(465, 700, 0.3),
    ]);
    expect(events).toEqual([{ player: "runner", action: "left" }]);
  });
  it("treats a long loss as the hand leaving, not as a swipe", () => {
    const events = run("runner", [
      ...rest(0, 300, 0.7),
      ...Array.from({ length: 12 }, (_, i): [number, null] => [333 + i * 33, null]),
      ...rest(729, 1000, 0.3),
    ]);
    expect(events).toEqual([]);
  });
  it("keeps the saboteur's target lock and fist hold through a dropped frame", () => {
    const events = run("saboteur", [
      ...rest(0, 300, 0.2).map((f): [number, number, string] => [...f, "Open_Palm"]),
      [333, 0.2, "Closed_Fist"],
      [366, null],
      [399, 0.5, "Closed_Fist"],
      [432, 0.5, "Closed_Fist"],
      [465, 0.5, "Closed_Fist"],
      [498, 0.5, "Closed_Fist"],
    ]);
    expect(events.filter((e) => e.action === "fire")).toHaveLength(1);
    // The palm drifted toward the middle while the hand blinked out; the lock holds lane 0.
    expect(events.filter((e) => e.action === "aim").at(-1)).toMatchObject({ lane: 0 });
  });
});
