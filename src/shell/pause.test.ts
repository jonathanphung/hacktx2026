import { describe, expect, it } from "vitest";
import { PlayClock } from "./pause";

describe("pause clock", () => {
  it("freezes while paused and excludes paused time after resuming", () => {
    const clock = new PlayClock();
    expect(clock.time(1000)).toBe(1000);
    clock.pause(1200);
    expect(clock.time(8000)).toBe(1200);
    clock.resume(8200);
    expect(clock.time(8300)).toBe(1300);
  });
  it("handles repeated pauses without counting them twice", () => {
    const clock = new PlayClock();
    clock.pause(1000);
    clock.pause(1500);
    clock.resume(3000);
    clock.resume(4000);
    clock.pause(5000);
    clock.resume(6000);
    expect(clock.time(6100)).toBe(3100);
  });
});
