import { expect, it } from "vitest";
import type { InputEvent } from "../shared/input";
import { createInterpreter } from "./interpreter";

function rng(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}
const GESTURES = [null, "None", "Open_Palm", "Closed_Fist", "Victory", "Pointing_Up", "Thumb_Up"];

it("never throws or emits invalid events on random, gappy, out-of-order frames", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const r = rng(seed);
    const events: InputEvent[] = [];
    const settings = { version: 1 as const, swipeDistance: 0.2, aim: { minX: 0.1, maxX: 0.9 } };
    const interpret = createInterpreter(
      (e) => events.push(e),
      () => settings,
    );
    let t = 0;
    for (let i = 0; i < 400; i++) {
      t += r() < 0.05 ? 400 : r() < 0.02 ? -50 : 15 + r() * 50;
      const hand = r() > 0.1;
      const x = r() < 0.03 ? NaN : r() * 1.4 - 0.2;
      interpret({
        player: r() < 0.5 ? "saboteur" : "runner",
        t,
        gesture: GESTURES[Math.floor(r() * GESTURES.length)],
        landmarks: hand ? Array.from({ length: 21 }, () => ({ x, y: r() })) : null,
      });
    }
    for (const e of events) if (e.action === "aim") expect([0, 1, 2]).toContain(e.lane);
  }
});

it("a fist never fires in a lane other than the one held before closing", () => {
  const settings = { version: 1 as const, swipeDistance: 0.2, aim: { minX: 0, maxX: 1 } };
  for (let seed = 1; seed <= 200; seed++) {
    const r = rng(seed);
    let game = 1;
    const fired: number[] = [];
    const interpret = createInterpreter(
      (e) => {
        if (e.player !== "saboteur") return;
        if (e.action === "aim") game = e.lane;
        if (e.action === "fire") fired.push(game);
      },
      () => settings,
    );
    const lane = Math.floor(r() * 3);
    const x0 = (lane + 0.5) / 3;
    let t = 0;
    const f = (g: string | null, x: number) =>
      interpret({
        player: "saboteur",
        t: (t += 33),
        gesture: g,
        landmarks: Array.from({ length: 21 }, () => ({ x, y: 0.5 })),
      });
    for (let i = 0; i < 15; i++) f("Open_Palm", x0);
    // Curl drift: palm slides up to a lane away while classification is uncertain/fist.
    const drift = Math.min(0.99, Math.max(0.01, x0 + (r() - 0.5) * 0.6));
    for (let i = 0; i < 2; i++) f(null, drift);
    for (let i = 0; i < 8; i++) f("Closed_Fist", drift);
    expect(fired).toEqual([lane]);
  }
});
