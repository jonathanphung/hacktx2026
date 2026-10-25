import { describe, expect, it } from "vitest";
import { hasEscapeLane } from "./spawn-safety";
import type { ObstacleSpec } from "../../shared/world";
describe("mixed giant and natural waves", () => {
  const fire: ObstacleSpec = { kind: "fireball", lane: 2, jumpable: false, effect: "end-run" };
  const wave = [
    { lane: 0 as const, y: 0, jumpable: false, lethal: true },
    { lane: 1 as const, y: 0, jumpable: false, lethal: true },
  ];
  it("defers a third unjumpable lane until earlier obstacles clear the entrance", () => {
    expect(hasEscapeLane(fire, wave)).toBe(false);
    expect(
      hasEscapeLane(
        fire,
        wave.map((o) => ({ ...o, y: 421 })),
      ),
    ).toBe(true);
  });
  it("allows a jumpable escape and repeat obstacles in the same lane", () => {
    expect(hasEscapeLane(fire, [wave[0], { ...wave[1], jumpable: true }])).toBe(true);
    expect(hasEscapeLane({ ...fire, lane: 0 }, wave)).toBe(true);
  });
});

it("defers a fast third lane that would catch older rocks below the old entrance cutoff", () => {
  const rocks = [0, 1].map((lane) => ({
    lane: lane as 0 | 1,
    y: 430,
    height: 48,
    minSpeed: 260,
    maxSpeed: 260,
    jumpable: false,
    lethal: true,
  }));
  const fire: ObstacleSpec = {
    kind: "fireball",
    lane: 2,
    height: 72,
    jumpable: false,
    effect: "end-run",
  };
  expect(hasEscapeLane(fire, rocks, { speed: 260, timeScale: 1 })).toBe(false);
  expect(
    hasEscapeLane(
      fire,
      rocks.map((o) => ({ ...o, y: 700 })),
      { speed: 260, timeScale: 1 },
    ),
  ).toBe(true);
  expect(
    hasEscapeLane(fire, [rocks[0], { ...rocks[1], jumpable: true }], { speed: 260, timeScale: 1 }),
  ).toBe(true);
});
it("holds a third lane while existing threats are frozen rather than dividing by zero", () => {
  const fire: ObstacleSpec = {
    kind: "fireball",
    lane: 2,
    height: 72,
    jumpable: false,
    effect: "end-run",
  };
  const frozen = [0, 1].map((lane) => ({
    lane: lane as 0 | 1,
    y: 500,
    minSpeed: 0,
    maxSpeed: 0,
    jumpable: false,
    lethal: true,
  }));
  expect(hasEscapeLane(fire, frozen, { speed: 156, timeScale: 0.6 })).toBe(false);
});
