import type Phaser from "phaser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Emitter } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import type { GameEvents, World } from "../../shared/world";
import { installSaboteur } from "./index";

afterEach(() => vi.restoreAllMocks());

function setup() {
  // Deterministic deals: always the first attack (Barrier, one obstacle). A random Double wall
  // spawns two obstacles and made the "called once" assertions flaky (~1 in 6 runs).
  vi.spyOn(Math, "random").mockReturnValue(0);
  const events = new Emitter<{ update: number; shutdown: undefined }>();
  const warnings: { destroy: ReturnType<typeof vi.fn> }[] = [];
  const scene = {
    events: {
      on: events.on.bind(events),
      off: vi.fn(),
      once: (_name: string, callback: () => void) => events.on("shutdown", callback),
    },
    add: {
      triangle: () => ({ setDepth: vi.fn() }),
      rectangle: () => {
        const warning = { setDepth: vi.fn(), destroy: vi.fn() };
        warnings.push(warning);
        return warning;
      },
    },
    tweens: { add: vi.fn() },
  } as unknown as Phaser.Scene;
  const world: World = {
    scene,
    events: new Emitter<GameEvents>(),
    laneX: (lane) => lane * 100,
    speed: 200,
    spawnObstacle: vi.fn(),
  };
  installSaboteur(scene, world);
  const fire = () =>
    inputBus.emit("input", { player: "saboteur", action: "fire", source: "keyboard" });
  return { events, world, warnings, fire };
}

describe("saboteur attack warnings", () => {
  it("waits 500 ms and locks the target lane at firing time", () => {
    const { events, world, warnings, fire } = setup();
    try {
      fire();
      expect(warnings).toHaveLength(0);
      events.emit("update", 50_000);
      fire();
      inputBus.emit("input", { player: "saboteur", action: "aim", lane: 2, source: "keyboard" });
      events.emit("update", 50_499);
      expect(world.spawnObstacle).not.toHaveBeenCalled();
      events.emit("update", 50_500);
      expect(world.spawnObstacle).toHaveBeenCalledWith(expect.objectContaining({ lane: 1 }));
      expect(warnings[0].destroy).toHaveBeenCalledOnce();
    } finally {
      events.emit("shutdown", undefined);
    }
  });

  it("enforces the cooldown without consuming a blocked card", () => {
    const { events, world, warnings, fire } = setup();
    try {
      events.emit("update", 0);
      events.emit("update", 9000);
      fire();
      fire();
      expect(warnings).toHaveLength(1);
      events.emit("update", 9749);
      fire();
      expect(warnings).toHaveLength(1);
      events.emit("update", 9750);
      fire();
      expect(warnings).toHaveLength(2);
      expect(world.spawnObstacle).toHaveBeenCalledOnce();
    } finally {
      events.emit("shutdown", undefined);
    }
  });

  it("cancels pending attacks and ignores input after game over", () => {
    const { events, world, warnings, fire } = setup();
    try {
      events.emit("update", 0);
      fire();
      world.events.emit("game-over", { score: 0, survivedMs: 100 });
      events.emit("update", 3000);
      fire();
      expect(world.spawnObstacle).not.toHaveBeenCalled();
      expect(warnings).toHaveLength(1);
      expect(warnings[0].destroy).toHaveBeenCalledOnce();
    } finally {
      events.emit("shutdown", undefined);
    }
  });
});
