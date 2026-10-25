import { afterEach, describe, expect, it } from "vitest";
import {
  acceptsPlayerInput,
  DEFAULT_TACTICS,
  parseTactics,
  setMatch,
  type MatchSnapshot,
} from "../../shared/match";
import { DIFFICULTY, giantAim, runnerDecision } from "./decisions";
const scene: MatchSnapshot = {
  runner: { lane: 1, x: 640, y: 610, airborne: false },
  speed: 400,
  stage: 0,
  obstacles: [],
  treasures: [],
};
afterEach(() => setMatch("duo", "normal"));
describe("single-player decisions", () => {
  it("keeps harder modes faster but fallible", () => {
    expect(DIFFICULTY.easy.reactionMs).toBeGreaterThan(DIFFICULTY.normal.reactionMs);
    expect(DIFFICULTY.normal.reactionMs).toBeGreaterThan(DIFFICULTY.hard.reactionMs);
    expect(DIFFICULTY.hard.mistake).toBeGreaterThan(0);
  });
  it("dodges solid threats and jumps low ones using normal input actions", () => {
    const state = {
      ...scene,
      obstacles: [{ lane: 1 as const, y: 500, height: 40, lethal: true, jumpable: false }],
    };
    expect(runnerDecision(state, DEFAULT_TACTICS, "normal", () => 0.3)?.action).toBe("left");
    state.obstacles[0].jumpable = true;
    expect(runnerDecision(state, DEFAULT_TACTICS, "normal", () => 0.3)?.action).toBe("jump");
    expect(runnerDecision(state, DEFAULT_TACTICS, "easy", () => 0.01)).toBeNull();
  });
  it("collects reachable treasures and changes giant tactics", () => {
    const state = { ...scene, treasures: [{ lane: 2 as const, y: 200 }] };
    expect(runnerDecision(state, DEFAULT_TACTICS, "hard", () => 0.3)?.action).toBe("right");
    expect(giantAim(state, { ...DEFAULT_TACTICS, aim: "track" }, 0)).toBe(1);
    expect(giantAim(state, { ...DEFAULT_TACTICS, aim: "predict" }, 0)).toBe(2);
    expect(giantAim(state, { ...DEFAULT_TACTICS, aim: "ambush" }, 0)).toBe(2);
  });
  it("blocks human controls for the opponent and validates Gemini plans", () => {
    setMatch("jon", "normal");
    expect(acceptsPlayerInput("saboteur", "keyboard")).toBe(false);
    expect(acceptsPlayerInput("saboteur", "ai")).toBe(true);
    expect(acceptsPlayerInput("runner", "keyboard")).toBe(true);
    expect(() => parseTactics({ ...DEFAULT_TACTICS, aggression: 2 })).toThrow();
    expect(() => parseTactics({ ...DEFAULT_TACTICS, preferredLane: 9 })).toThrow();
  });
});

it("uses individual hazard speed for jump timing, preserving legacy snapshots and frozen threats", () => {
  const obstacle = { lane: 1 as const, y: 430, height: 24, jumpable: true, lethal: true };
  const state = { ...scene, speed: 100, obstacles: [obstacle] };
  expect(runnerDecision(state, DEFAULT_TACTICS, "normal", () => 0.3)).toBeNull();
  expect(
    runnerDecision(
      { ...state, obstacles: [{ ...obstacle, speed: 500 }] },
      DEFAULT_TACTICS,
      "normal",
      () => 0.3,
    )?.action,
  ).toBe("jump");
  expect(
    runnerDecision(
      { ...state, obstacles: [{ ...obstacle, speed: 0 }] },
      DEFAULT_TACTICS,
      "normal",
      () => 0.3,
    ),
  ).toBeNull();
});
