import type Phaser from "phaser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Emitter } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import type { GameEvents, World } from "../../shared/world";
import { installSaboteur } from "./index";
import { SABOTEUR } from "./config";
import { createGiantHand } from "./giant-hand";
vi.mock("./giant-hand", () => ({
  createGiantHand: vi.fn(() => ({ release: vi.fn(), destroy: vi.fn() })),
}));

afterEach(() => vi.restoreAllMocks());

function setup() {
  // Deterministic deals: always the first attack (Barrier, one obstacle). A random Double wall
  // spawns two obstacles and made the "called once" assertions flaky (~1 in 6 runs).
  vi.spyOn(Math, "random").mockReturnValue(0);
  const events = new Emitter<{ update: number; shutdown: undefined }>();
  const warnings: { destroy: ReturnType<typeof vi.fn> }[] = [];
  const isPaused = vi.fn(() => false);
  const scene = {
    sys: { isPaused },
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
  return { events, world, warnings, fire, isPaused };
}

describe("saboteur attack warnings", () => {
  // Cooldown assertions count obstacles, so use a single-obstacle card.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("chooses a single-obstacle attack even at the end of the random pool", () => {
    vi.mocked(Math.random).mockReturnValue(0.999);
    const { events, world, fire } = setup();
    try {
      events.emit("update", 1000);
      fire();
      events.emit("update", 1000 + SABOTEUR.warningMs);
      expect(world.spawnObstacle).toHaveBeenCalledOnce();
      expect(world.spawnObstacle).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "fireball" }),
      );
    } finally {
      events.emit("shutdown", undefined);
    }
  });
  it("ignores aim and fire while the scene is paused", () => {
    const { events, warnings, fire, isPaused } = setup();
    try {
      events.emit("update", 1000);
      isPaused.mockReturnValue(true);
      inputBus.emit("input", { player: "saboteur", action: "aim", lane: 2, source: "vision" });
      fire();
      expect(warnings).toHaveLength(0);
      isPaused.mockReturnValue(false);
      fire();
      expect(warnings).toHaveLength(1);
    } finally {
      events.emit("shutdown", undefined);
    }
  });
  it("waits for the wind-up and locks the target lane at firing time", () => {
    const { events, world, warnings, fire } = setup();
    try {
      fire();
      expect(warnings).toHaveLength(0);
      events.emit("update", 50_000);
      fire();
      inputBus.emit("input", { player: "saboteur", action: "aim", lane: 2, source: "keyboard" });
      events.emit("update", 50_000 + SABOTEUR.warningMs - 1);
      expect(world.spawnObstacle).not.toHaveBeenCalled();
      events.emit("update", 50_000 + SABOTEUR.warningMs);
      expect(world.spawnObstacle).toHaveBeenCalledWith(expect.objectContaining({ lane: 1 }));
      expect(warnings[0].destroy).toHaveBeenCalledOnce();
      expect(vi.mocked(createGiantHand).mock.results[0].value.release).toHaveBeenCalledOnce();
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
      events.emit("update", 9000 + SABOTEUR.fireCooldownMs - 1);
      fire();
      expect(warnings).toHaveLength(1);
      events.emit("update", 9000 + SABOTEUR.fireCooldownMs);
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
      expect(vi.mocked(createGiantHand).mock.results[0].value.destroy).toHaveBeenCalledOnce();
    } finally {
      events.emit("shutdown", undefined);
    }
  });
});
