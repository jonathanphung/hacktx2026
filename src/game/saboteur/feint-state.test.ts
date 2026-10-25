import { expect, it } from "vitest";
import { FeintState, FEINT_COOLDOWN_MS, FEINT_WINDUP_MS } from "./feint-state";

it("allows one bluff, ends its wind-up once, and requires the full independent cooldown", () => {
  const state = new FeintState();
  expect(state.start(-1)).toBe(false);
  expect(state.start(NaN)).toBe(false);
  expect(state.start(1000)).toBe(true);
  expect(state.start(1100)).toBe(false);
  expect(state.finish(1000 + FEINT_WINDUP_MS - 1)).toBe(false);
  expect(state.finish(1000 + FEINT_WINDUP_MS)).toBe(true);
  expect(state.finish(1000 + FEINT_WINDUP_MS + 1)).toBe(false);
  expect(state.start(1000 + FEINT_COOLDOWN_MS - 1)).toBe(false);
  expect(state.start(1000 + FEINT_COOLDOWN_MS)).toBe(true);
});
