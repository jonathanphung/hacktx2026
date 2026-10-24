import { describe, expect, it, vi } from "vitest";
import { finishFireballs } from "./projectiles";
describe("fireball follow-through", () => {
  it("continues fireballs past the runner while other obstacles stay frozen", () => {
    const fire = { spec: { kind: "fireball" }, view: { y: 610, destroy: vi.fn() }, h: 72 };
    const rock = { spec: { kind: "barrier" }, view: { y: 400, destroy: vi.fn() }, h: 50 };
    const obstacles = [fire, rock];
    finishFireballs(obstacles, 300, 260);
    expect(fire.view.y).toBe(718);
    expect(rock.view.y).toBe(400);
    expect(fire.view.destroy).not.toHaveBeenCalled();
  });
  it("removes a fireball only after it leaves the bottom", () => {
    const fire = { spec: { kind: "fireball" }, view: { y: 610, destroy: vi.fn() }, h: 72 };
    const obstacles = [fire];
    finishFireballs(obstacles, 600, 260);
    expect(obstacles).toHaveLength(0);
    expect(fire.view.destroy).toHaveBeenCalledOnce();
  });
});
