import { describe, expect, it } from "vitest";
import { pointingHand } from "./test-hands";
import { PointTrigger, pointingDirection } from "./point";
import { StickyAim } from "./sticky-aim";
import { ZoneNudge } from "./zone";

describe("pointingDirection", () => {
  it("reads the direction of an extended index finger", () => {
    expect(pointingDirection(pointingHand("left"))).toBe("left");
    expect(pointingDirection(pointingHand("right"))).toBe("right");
    expect(pointingDirection(pointingHand("up"))).toBe("up");
  });
  it("ignores a fist, an open hand and bad input", () => {
    expect(pointingDirection(pointingHand(null))).toBeNull();
    expect(pointingDirection(null)).toBeNull();
    const open = pointingHand("up");
    for (const tip of [12, 16, 20]) open[tip] = { x: open[tip - 3].x, y: 0.4 };
    expect(pointingDirection(open)).toBeNull();
  });
});

describe("PointTrigger", () => {
  it("fires once after a hold, then needs the pose released", () => {
    const trigger = new PointTrigger();
    const fired: (string | null)[] = [];
    for (let t = 0; t <= 600; t += 33) fired.push(trigger.push(t, pointingHand("left")));
    expect(fired.filter(Boolean)).toEqual(["left"]);
    for (let t = 633; t <= 900; t += 33) trigger.push(t, pointingHand(null));
    const again: (string | null)[] = [];
    for (let t = 933; t <= 1300; t += 33) again.push(trigger.push(t, pointingHand("right")));
    expect(again.filter(Boolean)).toEqual(["right"]);
  });
  it("does not fire on a brief wave of the finger, a changing direction or after disarm", () => {
    const quick = new PointTrigger();
    for (let t = 0; t < 100; t += 33) expect(quick.push(t, pointingHand("left"))).toBeNull();
    const sweep = new PointTrigger();
    const out: (string | null)[] = [];
    for (let t = 0; t < 600; t += 33)
      out.push(sweep.push(t, pointingHand(Math.floor(t / 100) % 2 ? "left" : "right")));
    expect(out.filter(Boolean)).toEqual([]);
    const disarmed = new PointTrigger();
    disarmed.disarm();
    for (let t = 0; t < 600; t += 33) expect(disarmed.push(t, pointingHand("up"))).toBeNull();
  });
});

describe("ZoneNudge", () => {
  const dwell = (zone: ZoneNudge, x: number, from: number, to: number) => {
    const out: (string | null)[] = [];
    for (let t = from; t <= to; t += 33) out.push(zone.push(t, x));
    return out.filter(Boolean);
  };
  it("fires once when the hand rests at an edge after being centered", () => {
    const zone = new ZoneNudge();
    expect(dwell(zone, 0.5, 0, 300)).toEqual([]);
    expect(dwell(zone, 0.1, 333, 1000)).toEqual(["left"]);
    expect(dwell(zone, 0.5, 1033, 1300)).toEqual([]);
    expect(dwell(zone, 0.92, 1333, 2000)).toEqual(["right"]);
  });
  it("never fires for a hand that starts at the edge, after disarm, or on a lost hand", () => {
    const start = new ZoneNudge();
    expect(dwell(start, 0.1, 0, 1500)).toEqual([]);
    const swiped = new ZoneNudge();
    dwell(swiped, 0.5, 0, 300);
    swiped.disarm();
    expect(dwell(swiped, 0.1, 333, 1000)).toEqual([]);
    const lost = new ZoneNudge();
    dwell(lost, 0.5, 0, 300);
    lost.push(333, null);
    expect(dwell(lost, 0.1, 366, 1000)).toEqual([]);
  });
});

describe("StickyAim", () => {
  it("holds off position aiming until the hand rests, then moves a deliberate distance", () => {
    const sticky = new StickyAim();
    expect(sticky.push(0, 0.5)).toBe(false);
    sticky.engage();
    expect(sticky.push(33, 0.3)).toBe(true); // still moving after the step
    for (let t = 66; t <= 500; t += 33) expect(sticky.push(t, 0.2)).toBe(true); // at rest
    expect(sticky.push(533, 0.25)).toBe(true); // small drift is ignored
    expect(sticky.push(566, 0.45)).toBe(false); // deliberate move resumes aiming
    expect(sticky.push(599, 0.45)).toBe(false);
  });
  it("releases when the hand is lost", () => {
    const sticky = new StickyAim();
    sticky.engage();
    sticky.push(0, 0.5);
    expect(sticky.push(33, null)).toBe(false);
    expect(sticky.push(66, 0.5)).toBe(false);
  });
});
