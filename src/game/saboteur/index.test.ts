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

function setup() {
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
      triangle: () => ({ setDepth: vi.fn(), x: 0 }),
      rectangle: (...args: unknown[]) => {
        const rect = {
          setDepth: vi.fn(() => rect),
          x: 0,
          setAlpha: vi.fn(() => rect),
          destroy: vi.fn(),
        };
        // Only the 0.3-alpha attack warnings count; the lane glow is a permanent fixture.
        if (args[5] === 0.3) warnings.push(rect);
        return rect;
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
  it("acknowledges accepted and blocked casts for feedback", () => {
    const { events, world, fire } = setup();
    const feedback = vi.fn();
    world.events.on("cast-result", feedback);
    try {
      events.emit("update", 0);
      fire();
      fire();
      expect(feedback).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ accepted: true, attackId: "barrier" }),
      );
      expect(feedback).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          accepted: false,
          reason: "cooldown",
          remainingMs: SABOTEUR.fireCooldownMs,
        }),
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

describe("saboteur authoritative feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => vi.restoreAllMocks());

  it("reports starting, accepted, queued, cooldown and ready states", () => {
    const { events, world, fire } = setup();
    try {
      const results: GameEvents["cast-result"][] = [];
      const states: GameEvents["saboteur-status"][] = [];
      world.events.on("cast-result", (r) => results.push(r));
      world.events.on("saboteur-status", (s) => states.push(s));
      fire();
      expect(results.at(-1)).toMatchObject({ accepted: false, reason: "starting" });
      events.emit("update", 1000);
      fire();
      expect(results.at(-1)).toMatchObject({
        accepted: true,
        remainingMs: SABOTEUR.fireCooldownMs,
      });
      expect(states.at(-1)).toMatchObject({ state: "queued", remainingMs: SABOTEUR.warningMs });
      events.emit("update", 1100);
      fire();
      expect(results.at(-1)).toMatchObject({
        accepted: false,
        reason: "cooldown",
        remainingMs: SABOTEUR.fireCooldownMs - 100,
      });
      events.emit("update", 1000 + SABOTEUR.warningMs);
      expect(states.at(-1)).toMatchObject({ state: "cooldown" });
      events.emit("update", 1000 + SABOTEUR.fireCooldownMs);
      expect(states.at(-1)).toMatchObject({ state: "ready", remainingMs: 0 });
    } finally {
      events.emit("shutdown", undefined);
    }
  });

  it("rejects casts after game over", () => {
    const { events, world, fire } = setup();
    try {
      const results: GameEvents["cast-result"][] = [];
      world.events.on("cast-result", (r) => results.push(r));
      world.events.emit("game-over", { score: 0, survivedMs: 1 });
      fire();
      expect(results.at(-1)).toMatchObject({ accepted: false, reason: "game-over" });
    } finally {
      events.emit("shutdown", undefined);
    }
  });
});

describe("saboteur input stress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => vi.restoreAllMocks());

  it("never casts faster than the cooldown under random input spam", () => {
    for (let seed = 1; seed <= 50; seed++) {
      let n = seed;
      const rand = () => (n = (n * 1664525 + 1013904223) >>> 0) / 2 ** 32;
      const { events, world } = setup();
      try {
        const accepted: number[] = [];
        let clock = 0;
        world.events.on("cast-result", (r) => r.accepted && accepted.push(clock));
        for (let i = 0; i < 600; i++) {
          clock += 16;
          events.emit("update", clock);
          if (rand() < 0.3)
            inputBus.emit("input", { player: "saboteur", action: "fire", source: "vision" });
          if (rand() < 0.3)
            inputBus.emit("input", {
              player: "saboteur",
              action: "aim",
              lane: Math.floor(rand() * 3) as 0 | 1 | 2,
              source: "vision",
            });
        }
        for (let i = 1; i < accepted.length; i++)
          expect(accepted[i] - accepted[i - 1]).toBeGreaterThanOrEqual(SABOTEUR.fireCooldownMs);
        expect(accepted.length).toBeGreaterThan(0);
      } finally {
        events.emit("shutdown", undefined);
      }
    }
  });
});

describe("saboteur fire buffering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => vi.restoreAllMocks());

  it("casts a fire sent just before the cooldown ends, at the lane aimed when it was sent", () => {
    const { events, world, warnings, fire } = setup();
    try {
      const results: GameEvents["cast-result"][] = [];
      world.events.on("cast-result", (r) => results.push(r));
      events.emit("update", 1000);
      fire();
      const ready = 1000 + SABOTEUR.fireCooldownMs;
      events.emit("update", ready - 100);
      inputBus.emit("input", { player: "saboteur", action: "aim", lane: 2, source: "vision" });
      fire();
      expect(warnings).toHaveLength(1);
      expect(results.filter((r) => !r.accepted)).toHaveLength(0);
      inputBus.emit("input", { player: "saboteur", action: "aim", lane: 0, source: "vision" });
      events.emit("update", ready);
      expect(warnings).toHaveLength(2);
      expect(results.at(-1)).toMatchObject({ accepted: true, lane: 2 });
    } finally {
      events.emit("shutdown", undefined);
    }
  });

  it("still rejects a fire that is too early for the buffer, and never double-casts", () => {
    const { events, warnings, world, fire } = setup();
    try {
      const results: GameEvents["cast-result"][] = [];
      world.events.on("cast-result", (r) => results.push(r));
      events.emit("update", 1000);
      fire();
      events.emit("update", 1000 + SABOTEUR.fireCooldownMs - SABOTEUR.fireBufferMs - 1);
      fire();
      expect(results.at(-1)).toMatchObject({ accepted: false, reason: "cooldown" });
      events.emit("update", 1000 + SABOTEUR.fireCooldownMs + 16);
      events.emit("update", 1000 + SABOTEUR.fireCooldownMs + 32);
      expect(warnings).toHaveLength(1);
    } finally {
      events.emit("shutdown", undefined);
    }
  });
});
