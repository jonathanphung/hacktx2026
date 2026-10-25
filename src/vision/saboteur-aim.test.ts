import { expect, it } from "vitest";
import { createInterpreter } from "./interpreter";
import type { InputEvent } from "../shared/input";
function setup() {
  const events: InputEvent[] = [];
  const settings = { version: 1 as const, swipeDistance: 0.2, aim: { minX: 0, maxX: 1 } };
  const interpret = createInterpreter(
    (e) => events.push(e),
    () => settings,
  );
  const push = (t: number, x: number, gesture: string | null = "Open_Palm") =>
    interpret({
      player: "saboteur",
      t,
      gesture,
      landmarks: Array.from({ length: 21 }, () => ({ x, y: 0.5 })),
    });
  const lane = () => events.flatMap((e) => (e.action === "aim" ? [e.lane] : [])).at(-1) ?? 1;
  const lose = (t: number) => interpret({ player: "saboteur", t, gesture: null, landmarks: null });
  return { events, push, lane, lose };
}
it("follows camera-column changes after a relative swipe without requiring a stop", () => {
  const s = setup();
  for (let t = 0; t <= 300; t += 33) s.push(t, 0.12);
  for (let t = 333; t <= 500; t += 33) s.push(t, 0.02 + ((t - 333) / 167) * 0.2);
  s.push(510, 0.24);
  expect(s.lane()).toBe(1);
  for (let t = 533; t <= 800; t += 33) s.push(t, 0.24 + ((t - 533) / 267) * 0.63);
  expect(s.lane()).toBe(2);
  for (let t = 833; t <= 1100; t += 33) s.push(t, 0.87 - ((t - 833) / 267) * 0.4);
  expect(s.lane()).toBe(1);
});
it("does not lose a new swipe because an older position change is still in history", () => {
  const s = setup();
  for (let t = 0; t <= 198; t += 33) s.push(t, 0.1);
  for (const [t, x] of [
    [231, 0.35],
    [264, 0.44],
    [297, 0.5],
    [330, 0.5],
    [363, 0.5],
    [396, 0.61],
    [429, 0.72],
  ])
    s.push(t, x);
  expect(s.lane()).toBe(2);
});
it("recovers position aiming after a one-frame false fist followed by uncertain poses", () => {
  const s = setup();
  for (let t = 0; t <= 198; t += 33) s.push(t, 0.15);
  s.push(231, 0.15, "Closed_Fist");
  for (let t = 264; t <= 660; t += 33) s.push(t, 0.85, null);
  expect(s.lane()).toBe(2);
  expect(s.events.filter((e) => e.action === "fire")).toHaveLength(0);
});

it("accepts opposite swipes inside the same camera column in rapid succession", () => {
  const s = setup();
  for (const [t, x] of [
    [0, 0.4],
    [33, 0.52],
    [66, 0.64],
  ])
    s.push(t, x);
  expect(s.lane()).toBe(2);
  for (const [t, x] of [
    [99, 0.64],
    [132, 0.52],
    [165, 0.4],
  ])
    s.push(t, x);
  expect(s.lane()).toBe(1);
});
it("does not double-step a swipe that already crossed into the next camera column", () => {
  const s = setup();
  for (let t = 0; t <= 198; t += 33) s.push(t, 0.15);
  for (let t = 231; t <= 396; t += 33) s.push(t, 0.15 + ((t - 231) / 165) * 0.35);
  for (let t = 429; t <= 650; t += 33) s.push(t, 0.5);
  expect(s.events.flatMap((e) => (e.action === "aim" ? [e.lane] : []))).toEqual([0, 1]);
});
it("keeps an in-column swipe selected while still, then resynchronizes after hand loss", () => {
  const s = setup();
  for (const [t, x] of [
    [0, 0.4],
    [33, 0.52],
    [66, 0.64],
  ])
    s.push(t, x);
  for (let t = 99; t <= 600; t += 33) s.push(t, 0.64);
  expect(s.lane()).toBe(2);
  s.lose(800);
  s.push(833, 0.5);
  expect(s.lane()).toBe(1);
});
