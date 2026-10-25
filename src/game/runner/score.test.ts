import { describe, expect, it } from "vitest";
import { SCORE, TalePots } from "./score";

describe("per-tale score pots", () => {
  it("starts each tale with a full pot and nothing banked", () => {
    const p = new TalePots();
    expect(p.pot).toBe(SCORE.potStart);
    expect(p.score).toBe(0);
  });

  it("drains the pot over time, and banks what's left when the item is collected", () => {
    const p = new TalePots();
    p.drain(10_000);
    expect(p.pot).toBe(SCORE.potStart - SCORE.drainPerSec * 10);
    p.bank();
    expect(p.score).toBe(SCORE.potStart - SCORE.drainPerSec * 10);
    expect(p.pot).toBe(SCORE.potStart);
  });

  it("never drains below the floor", () => {
    const p = new TalePots();
    p.drain(10 * 60_000);
    expect(p.pot).toBe(SCORE.potFloor);
  });

  it("drains more slowly with a slowdown bonus", () => {
    const p = new TalePots();
    p.drain(10_000, 2);
    expect(p.pot).toBe(SCORE.potStart - SCORE.drainPerSec * 5);
  });

  it("loses the pot in progress if Jon is caught: getting caught early scores less", () => {
    const early = new TalePots();
    early.drain(5_000); // caught 5 s in: nothing banked
    const later = new TalePots();
    later.drain(12_000);
    later.bank();
    later.drain(3_000); // caught in the second tale
    expect(early.score).toBe(0);
    expect(later.score).toBeGreaterThan(early.score);
  });

  it("finishing a tale faster scores more", () => {
    const fast = new TalePots();
    fast.drain(11_000);
    fast.bank();
    const slow = new TalePots();
    slow.drain(25_000);
    slow.bank();
    expect(fast.score).toBeGreaterThan(slow.score);
  });

  it("adds a bonus when banking, and keeps whole points", () => {
    const p = new TalePots();
    p.drain(333);
    p.bank(500);
    expect(Number.isInteger(p.score)).toBe(true);
    expect(p.score).toBe(Math.floor(SCORE.potStart - SCORE.drainPerSec * 0.333) + 500);
  });
});
