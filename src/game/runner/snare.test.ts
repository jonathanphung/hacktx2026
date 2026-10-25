import { expect, it } from "vitest";
import { Snare } from "./snare";
it("makes a snare prevent rapid chained dodges and fully releases after expiry", () => {
  const snare = new Snare();
  snare.apply(1000, 2000);
  expect(snare.movementFactor(1000)).toBe(0.3);
  expect(snare.allowDodge(1000)).toBe(true);
  expect(snare.allowDodge(1200)).toBe(false);
  expect(snare.allowDodge(1549)).toBe(false);
  expect(snare.allowDodge(1550)).toBe(true);
  expect(snare.movementFactor(3000)).toBe(1);
  expect(snare.allowDodge(3000)).toBe(true);
  expect(snare.allowDodge(3001)).toBe(true);
});
