import { describe, expect, it } from "vitest";
import { Deck } from "./deck";

const opts = { dealMs: 1000, handSize: 3 };
const first = () => 0; // rng that always picks pool[0]

describe("Deck", () => {
  it("supports a stronger opening hand while respecting capacity", () => {
    expect(new Deck(["a"], { ...opts, startingCards: 2 }, first).hand).toEqual(["a", "a"]);
    expect(new Deck(["a"], { ...opts, startingCards: 5 }, first).hand).toHaveLength(3);
  });
  it("starts with one card and deals one per interval from the first update", () => {
    const deck = new Deck(["a", "b"], opts, first);
    expect(deck.hand).toEqual(["a"]);
    expect(deck.update(50_000)).toBe(false); // first update only starts the clock
    expect(deck.update(50_999)).toBe(false);
    expect(deck.update(51_000)).toBe(true);
    expect(deck.hand).toHaveLength(2);
  });

  it("never exceeds the hand size", () => {
    const deck = new Deck(["a"], opts, first);
    deck.update(0);
    deck.update(10_000);
    expect(deck.hand).toHaveLength(3);
  });

  it("takes the selected card and keeps the selection valid", () => {
    const deck = new Deck(["a", "b", "c"], opts, first);
    deck.hand = ["a", "b", "c"];
    deck.select(2);
    expect(deck.take()).toBe("c");
    expect(deck.selected).toBe(1);
    deck.take();
    deck.take();
    expect(deck.take()).toBeNull();
  });
});
