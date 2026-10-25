import { expect, it } from "vitest";
import { TargetLock } from "./target-lock";

it("rewinds to the lane held before the hand started closing, then holds it", () => {
  const lock = new TargetLock(200);
  for (let t = 0; t < 400; t += 40) expect(lock.push(t, "Open_Palm", true, 0)).toBeNull();
  // Curling fingers shift the palm into lane 1 just before the fist is recognized.
  expect(lock.push(400, null, true, 1)).toBeNull();
  expect(lock.push(440, "Closed_Fist", true, 1)).toBe(0);
  expect(lock.locked).toBe(true);
  expect(lock.push(480, "Closed_Fist", true, 2)).toBeNull();
  expect(lock.locked).toBe(true);
});

it("resumes aiming when the hand opens or is lost", () => {
  const lock = new TargetLock(200);
  for (let t = 0; t < 300; t += 40) lock.push(t, "Open_Palm", true, 2);
  expect(lock.push(300, "Closed_Fist", true, 2)).toBe(2);
  expect(lock.push(340, null, true, 1)).toBeNull();
  expect(lock.locked).toBe(true);
  lock.push(380, "Open_Palm", true, 1);
  expect(lock.locked).toBe(false);
  lock.push(420, "Closed_Fist", true, 1);
  expect(lock.locked).toBe(true);
  lock.push(460, null, false, 1);
  expect(lock.locked).toBe(false);
});

it("does not latch aim indefinitely after one false fist frame", () => {
  const lock = new TargetLock();
  lock.push(0, "Open_Palm", true, 1);
  lock.push(33, "Closed_Fist", true, 1);
  for (const t of [66, 99, 132, 165, 198]) lock.push(t, null, true, 2);
  expect(lock.locked).toBe(false);
});
it("releases for a recognized non-fist pose while tolerating brief uncertain frames", () => {
  const lock = new TargetLock();
  lock.push(0, "Closed_Fist", true, 1);
  lock.push(33, null, true, 2);
  expect(lock.locked).toBe(true);
  lock.push(66, "Pointing_Up", true, 2);
  expect(lock.locked).toBe(false);
});
