import type Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";
import { Emitter } from "../../../shared/emitter";
import { LANES } from "../../../shared/types";
import type { GameEvents, ObstacleSpec, World } from "../../../shared/world";
import { ATTACKS } from "./index";
import { doubleWall } from "./double-wall";
import { drifter } from "./drifter";
import { mud } from "./mud";

vi.mock("../obstacle-view", () => ({
  createObstacleView: (scene: Phaser.Scene, x: number, y: number) =>
    scene.add.rectangle(x, y, 60, 30, 0),
}));

function setup() {
  const obstacles: ObstacleSpec[] = [];
  const world: World = {
    scene: {} as Phaser.Scene,
    events: new Emitter<GameEvents>(),
    laneX: (lane) => 500 + lane * 120,
    speed: 200,
    spawnObstacle: (spec) => obstacles.push(spec),
  };
  return { world, obstacles };
}

describe("new attacks", () => {
  it("registers unique card ids", () => {
    expect(new Set(ATTACKS.map((attack) => attack.id)).size).toBe(ATTACKS.length);
    expect(ATTACKS).toEqual(expect.arrayContaining([doubleWall, mud, drifter]));
  });

  it.each(LANES)("double wall leaves an escape lane when aimed at %i", (lane) => {
    const { world, obstacles } = setup();
    doubleWall.fire(world, lane);
    const blocked = new Set(obstacles.map((obstacle) => obstacle.lane));
    expect(blocked.size).toBe(2);
    expect(blocked.has(lane)).toBe(true);
    expect([...blocked].every((target) => LANES.includes(target))).toBe(true);
  });

  it("mud slows without allowing jumps to bypass it", () => {
    const { world, obstacles } = setup();
    mud.fire(world, 1);
    expect(obstacles[0]).toMatchObject({ lane: 1, jumpable: false, effect: "slow" });
  });

  it.each(LANES)("drifter moves across one lane and cleans up at %i", (lane) => {
    const { world, obstacles } = setup();
    drifter.fire(world, lane);
    const listeners = new Map<string, (...args: number[]) => void>();
    let destroy = () => {};
    const view = {
      x: world.laneX(lane),
      once: (_event: string, callback: () => void) => {
        destroy = callback;
      },
    };
    const scene = {
      add: { rectangle: () => view },
      events: {
        on: (event: string, callback: (...args: number[]) => void) =>
          listeners.set(event, callback),
        once: (event: string, callback: () => void) => listeners.set(event, callback),
        off: vi.fn((event: string) => listeners.delete(event)),
      },
    };
    obstacles[0].createView!(scene as unknown as Phaser.Scene, view.x, -30);
    const update = listeners.get("update")!;
    update(50_000);
    expect(view.x).toBe(world.laneX(lane));
    update(50_750);
    const target = world.laneX(lane === 2 ? 1 : ((lane + 1) as 1 | 2));
    expect(view.x).toBe((world.laneX(lane) + target) / 2);
    update(52_000);
    expect(view.x).toBe(target);
    destroy();
    expect(listeners.size).toBe(0);
  });
});
