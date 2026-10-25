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
        wave.map((o) => ({ ...o, y: 201 })),
      ),
    ).toBe(true);
  });
  it("allows a jumpable escape and repeat obstacles in the same lane", () => {
    expect(hasEscapeLane(fire, [wave[0], { ...wave[1], jumpable: true }])).toBe(true);
    expect(hasEscapeLane({ ...fire, lane: 0 }, wave)).toBe(true);
  });
});
