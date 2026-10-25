import { expect, it } from "vitest";
import { AttackRotation, GIANT_ROTATION } from "./rotation";
import { GiantInventory } from "./inventory";

it("peeks without consuming and repeats the exact order over multiple laps", () => {
  const rotation = new AttackRotation();
  expect(rotation.peek()).toEqual(["barrier", "hurdle", "oil"]);
  expect(rotation.peek()).toEqual(rotation.peek());
  expect(Array.from({ length: 15 }, () => rotation.next())).toEqual([
    ...GIANT_ROTATION,
    ...GIANT_ROTATION,
    ...GIANT_ROTATION,
  ]);
});
it("keeps the forecast exact through refill, blocked draws and inventory growth", () => {
  const rotation = new AttackRotation();
  const stock = new GiantInventory(() => rotation.next());
  expect([...stock.cards, ...rotation.peek(3)]).toEqual(["barrier", "hurdle", "oil", "mud"]);
  expect(stock.take(1000)).toBe("barrier");
  expect(stock.take(1100)).toBeUndefined();
  expect(rotation.peek(3)).toEqual(["hurdle", "oil", "mud"]);
  stock.grow(4);
  expect(stock.cards).toEqual(["hurdle", "oil"]);
  stock.update(5000);
  expect([...stock.cards, ...rotation.peek(3)]).toEqual([
    "hurdle",
    "oil",
    "mud",
    "fireball",
    "barrier",
    "hurdle",
  ]);
});
