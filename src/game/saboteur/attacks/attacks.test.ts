import type Phaser from "phaser";
import { describe, expect, it } from "vitest";
import { Emitter } from "../../../shared/emitter";
import { LANES } from "../../../shared/types";
import type { GameEvents, ObstacleSpec, World } from "../../../shared/world";
import { ATTACKS } from "./index";
import { doubleWall } from "./double-wall";
import { fireball } from "./fireball";
import { mud } from "./mud";

function setup() {
  const obstacles: ObstacleSpec[] = [];
  const world: World = {
    scene: {} as Phaser.Scene,
    events: new Emitter<GameEvents>(),
    laneX: (lane) => 500 + lane * 120,
    speed: 200,
    spawnObstacle: (spec) => {
      obstacles.push(spec);
    },
  };
  return { world, obstacles };
}
describe("attacks", () => {
  it("registers unique ids and replaces drifter with fireball", () => {
    expect(new Set(ATTACKS.map((a) => a.id)).size).toBe(ATTACKS.length);
    expect(ATTACKS).toEqual(expect.arrayContaining([doubleWall, mud, fireball]));
    expect(ATTACKS.some((a) => a.id === "drifter")).toBe(false);
  });
  it.each(LANES)("double wall leaves an escape lane when aimed at %i", (lane) => {
    const { world, obstacles } = setup();
    doubleWall.fire(world, lane);
    const blocked = new Set(obstacles.map((o) => o.lane));
    expect(blocked.size).toBe(2);
    expect(blocked.has(lane)).toBe(true);
    expect([...blocked].every((l) => LANES.includes(l))).toBe(true);
  });
  it("mud slows without allowing jumps to bypass it", () => {
    const { world, obstacles } = setup();
    mud.fire(world, 1);
    expect(obstacles[0]).toMatchObject({ lane: 1, jumpable: false, effect: "slow" });
  });
  it.each(LANES)("fireball targets one lane without drifting or allowing a jump at %i", (lane) => {
    const { world, obstacles } = setup();
    fireball.fire(world, lane);
    expect(obstacles).toHaveLength(1);
    expect(obstacles[0]).toMatchObject({
      kind: "fireball",
      lane,
      jumpable: false,
      effect: "end-run",
      width: 64,
      height: 72,
    });
  });
});
