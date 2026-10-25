import type Phaser from "phaser";
import { afterEach, expect, it, vi } from "vitest";
import { Emitter } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import { setMatch } from "../../shared/match";
import type { GameEvents, World } from "../../shared/world";
import { installAi } from ".";
vi.mock("../../shell/presentation", () => ({ mountShell: () => ({ textContent: "" }) }));
afterEach(() => {
  setMatch("duo", "normal");
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("drives the giant through legal inputs and stops during pause and after shutdown", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("offline");
    }),
  );
  setMatch("jon", "normal");
  const updates = new Emitter<{ update: number; shutdown: undefined }>();
  const isPaused = vi.fn(() => false);
  const scene = {
    sys: { isPaused },
    events: {
      on: updates.on.bind(updates),
      off: vi.fn(),
      once: (_event: string, fn: () => void) => updates.on("shutdown", fn),
    },
  } as unknown as Phaser.Scene;
  const events = new Emitter<GameEvents>();
  const world = {
    scene,
    events,
    speed: 300,
    laneX: (n: number) => n * 100,
    spawnObstacle: vi.fn(),
    snapshot: () => ({
      runner: { lane: 1 as const, x: 640, y: 610, airborne: false },
      speed: 300,
      stage: 0,
      obstacles: [],
      treasures: [],
    }),
  } as World;
  const actions = vi.fn(),
    off = inputBus.on("input", actions);
  try {
    installAi(scene, world);
    events.emit("saboteur-status", { state: "ready", remainingMs: 0, aimLane: 1 });
    for (const time of [0, 300, 600, 900, 1200]) updates.emit("update", time);
    expect(actions).toHaveBeenCalledWith(
      expect.objectContaining({ player: "saboteur", action: "fire", source: "ai" }),
    );
    const count = actions.mock.calls.length;
    isPaused.mockReturnValue(true);
    updates.emit("update", 2000);
    expect(actions).toHaveBeenCalledTimes(count);
    isPaused.mockReturnValue(false);
    updates.emit("shutdown", undefined);
    updates.emit("update", 12000);
    expect(actions).toHaveBeenCalledTimes(count);
    await Promise.resolve();
    await Promise.resolve();
  } finally {
    off();
    updates.emit("shutdown", undefined);
  }
});
