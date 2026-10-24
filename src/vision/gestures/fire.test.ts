import { describe, expect, it } from "vitest";
import { FistTrigger } from "./fire";

describe("FistTrigger", () => {
  it.each([15, 30, 60])("holds for elapsed time at %i fps, once per close", (fps) => {
    const trigger = new FistTrigger();
    const fired: number[] = [];
    for (let t = 0; t < 700; t += 1000 / fps) if (trigger.push(t, "Closed_Fist")) fired.push(t);
    expect(fired).toHaveLength(1);
    expect(fired[0]).toBeGreaterThanOrEqual(100);
    expect(fired[0]).toBeLessThan(170);
  });
  it("never re-arms from missing hands or unknown labels", () => {
    const trigger = new FistTrigger();
    trigger.push(0, "Closed_Fist");
    expect(trigger.push(120, "Closed_Fist")).toBe(true);
    trigger.push(150, null);
    trigger.push(180, "None");
    trigger.push(210, "Closed_Fist");
    expect(trigger.push(330, "Closed_Fist")).toBe(false);
  });
  it("requires a deliberate open-palm release", () => {
    const trigger = new FistTrigger();
    trigger.push(0, "Closed_Fist");
    expect(trigger.push(120, "Closed_Fist")).toBe(true);
    trigger.push(150, "Open_Palm");
    trigger.push(280, "Open_Palm");
    trigger.push(300, "Closed_Fist");
    expect(trigger.push(420, "Closed_Fist")).toBe(true);
  });
  it("does not accumulate dwell across a camera stall", () => {
    const trigger = new FistTrigger();
    trigger.push(0, "Closed_Fist");
    expect(trigger.push(1000, "Closed_Fist")).toBe(false);
  });
});

it("tolerates a brief uncertain classification during a fist hold", () => {
  const trigger = new FistTrigger();
  expect(trigger.push(0, "Closed_Fist")).toBe(false);
  expect(trigger.push(40, null)).toBe(false);
  expect(trigger.push(70, "Closed_Fist")).toBe(false);
  expect(trigger.push(110, "Closed_Fist")).toBe(true);
  expect(trigger.push(150, "Closed_Fist")).toBe(false);
});

it("tolerates brief uncertainty during open-palm rearming", () => {
  const trigger = new FistTrigger();
  trigger.push(0, "Closed_Fist");
  expect(trigger.push(120, "Closed_Fist")).toBe(true);
  trigger.push(150, "Open_Palm");
  trigger.push(190, null);
  trigger.push(220, "Open_Palm");
  trigger.push(280, "Open_Palm");
  trigger.push(300, "Closed_Fist");
  expect(trigger.push(420, "Closed_Fist")).toBe(true);
});

it("does not bridge prolonged uncertainty or another classified pose", () => {
  for (const gesture of [null, "None", "Victory"]) {
    const trigger = new FistTrigger();
    trigger.push(0, "Closed_Fist");
    trigger.push(40, gesture);
    trigger.push(90, gesture);
    expect(trigger.push(120, "Closed_Fist")).toBe(false);
  }
});

it("rejects missing, degenerate, folded, or non-finite open-hand evidence", async () => {
  const { hasOpenFingers } = await import("./fire");
  expect(hasOpenFingers(null)).toBe(false);
  expect(hasOpenFingers([])).toBe(false);
  expect(hasOpenFingers(Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 })))).toBe(false);
  const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.8 }));
  for (const base of [5, 9, 13, 17]) {
    points[base] = { x: 0.5, y: 0.6 };
    points[base + 1] = { x: 0.5, y: 0.45 };
    points[base + 3] = { x: 0.5, y: 0.15 };
  }
  expect(hasOpenFingers(points)).toBe(true);
  expect(hasOpenFingers(points.map(({ x, y }) => ({ x: y, y: -x })))).toBe(true);
  points[8] = { x: 0.5, y: 0.65 };
  expect(hasOpenFingers(points)).toBe(false);
  points[8] = { x: NaN, y: 0.15 };
  expect(hasOpenFingers(points)).toBe(false);
});
