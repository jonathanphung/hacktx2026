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
