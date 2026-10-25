import { expect, it, vi } from "vitest";
import { detonate } from "./blast";
it("explodes and removes every active threat and backlog once, leaving unrelated items alone", () => {
  const threats = [100, 400, 650].map((y) => ({ view: { x: 640, y, destroy: vi.fn() } }));
  const handles = threats.map((t) => t.view.destroy);
  const waiting = [{ kind: "barrier" }];
  const treasure = { destroy: vi.fn() },
    pickup = { destroy: vi.fn() };
  const burst = vi.fn();
  expect(detonate(threats, waiting, burst)).toBe(3);
  expect(threats).toEqual([]);
  expect(waiting).toEqual([]);
  handles.forEach((destroy) => expect(destroy).toHaveBeenCalledOnce());
  expect(burst.mock.calls).toEqual([
    [640, 100],
    [640, 400],
    [640, 650],
  ]);
  expect(treasure.destroy).not.toHaveBeenCalled();
  expect(pickup.destroy).not.toHaveBeenCalled();
  expect(detonate(threats, waiting, burst)).toBe(0);
  expect(burst).toHaveBeenCalledTimes(3);
});
