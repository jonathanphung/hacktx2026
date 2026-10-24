import { describe, expect, it } from "vitest";
import { GiantInventory } from "./inventory";
describe("giant FIFO inventory", () => {
  it("grows every two completed tales and keeps draw order", () => {
    let n = 0;
    const stock = new GiantInventory(() => String(n++));
    stock.grow(1);
    expect(stock.capacity).toBe(1);
    stock.grow(2);
    expect(stock.cards).toEqual(["0", "1"]);
    stock.grow(4);
    expect(stock.cards).toEqual(["0", "1", "2"]);
    expect(stock.take(0)).toBe("0");
    expect(stock.take(1700)).toBe("1");
    expect(stock.update(3999)).toBe(false);
    expect(stock.update(4000)).toBe(true);
    expect(stock.cards).toEqual(["2", "3"]);
  });
  it("never catches up a backlog with a burst or exceeds capacity", () => {
    const stock = new GiantInventory(() => "fireball");
    stock.take(0);
    stock.update(90000);
    expect(stock.cards).toHaveLength(1);
    expect(stock.update(90001)).toBe(false);
    stock.grow(6);
    expect(stock.capacity).toBe(3);
  });
});
