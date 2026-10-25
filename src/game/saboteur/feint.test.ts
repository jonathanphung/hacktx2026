import type Phaser from "phaser";
import { afterEach, expect, it, vi } from "vitest";
import { Emitter } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import type { GameEvents, World } from "../../shared/world";
import { installGiantFeint } from "./feint";
import { createGiantHand } from "./giant-hand";
import { mountShell } from "../../shell/presentation";
vi.mock("./giant-hand", () => ({ createGiantHand: vi.fn(() => ({ destroy: vi.fn() })) }));
vi.mock("../../shell/presentation", () => ({ mountShell: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function setup() {
  const clock = new Emitter<{ update: number; shutdown: undefined }>();
  const clicks = new Map<string, () => void>();
  const keys = new Map<string, (e: unknown) => void>();
  const button = {
    disabled: true,
    textContent: "",
    addEventListener: (key: string, fn: () => void) => clicks.set(key, fn),
  };
  vi.mocked(mountShell).mockReturnValue({
    innerHTML: "",
    querySelector: () => button,
  } as unknown as HTMLDivElement);
  vi.stubGlobal("HTMLElement", class {});
  vi.stubGlobal("window", {
    addEventListener: (key: string, fn: (e: unknown) => void) => keys.set(key, fn),
    removeEventListener: (key: string) => keys.delete(key),
  });
  const isPaused = vi.fn(() => false);
  const scene = {
    sys: { isPaused },
    events: {
      on: clock.on.bind(clock),
      off: vi.fn(),
      once: (_key: string, fn: () => void) => clock.on("shutdown", fn),
    },
  } as unknown as Phaser.Scene;
  const world: World = {
    scene,
    events: new Emitter<GameEvents>(),
    laneX: (lane) => 470 + lane * 170,
    speed: 260,
    spawnObstacle: vi.fn(),
  };
  installGiantFeint(scene, world);
  const fire = () => clicks.get("click")!();
  const stop = () => clock.emit("shutdown", undefined);
  return { clock, world, button, fire, stop, isPaused, keys };
}
it("fakes the current aimed lane without spawning an obstacle or consuming normal fire input", () => {
  const s = setup();
  try {
    s.fire();
    expect(createGiantHand).not.toHaveBeenCalled();
    s.clock.emit("update", 1000);
    inputBus.emit("input", { player: "saboteur", action: "aim", lane: 2, source: "vision" });
    s.fire();
    expect(createGiantHand).toHaveBeenCalledWith(expect.anything(), 810, 0xff5252, 650, "barrier");
    s.fire();
    expect(createGiantHand).toHaveBeenCalledOnce();
    s.clock.emit("update", 1700);
    expect(vi.mocked(createGiantHand).mock.results[0].value.destroy).toHaveBeenCalledOnce();
    inputBus.emit("input", { player: "saboteur", action: "fire", source: "vision" });
    expect(createGiantHand).toHaveBeenCalledOnce();
    expect(s.world.spawnObstacle).not.toHaveBeenCalled();
    expect(s.button.disabled).toBe(true);
    s.clock.emit("update", 9000);
    expect(s.button.disabled).toBe(false);
  } finally {
    s.stop();
  }
});
it("blocks fake-outs while paused and after game over, and cleans up the keyboard listener", () => {
  const s = setup();
  try {
    s.clock.emit("update", 1000);
    s.isPaused.mockReturnValue(true);
    s.fire();
    expect(createGiantHand).not.toHaveBeenCalled();
    s.isPaused.mockReturnValue(false);
    s.fire();
    const hand = vi.mocked(createGiantHand).mock.results[0].value;
    s.world.events.emit("game-over", { score: 0, survivedMs: 1000 });
    expect(hand.destroy).toHaveBeenCalledOnce();
    s.clock.emit("update", 20000);
    s.fire();
    expect(createGiantHand).toHaveBeenCalledOnce();
    expect(s.button.disabled).toBe(true);
  } finally {
    s.stop();
  }
  expect(s.keys.has("keydown")).toBe(false);
});
