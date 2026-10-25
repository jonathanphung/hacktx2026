import type Phaser from "phaser";
import { expect, it, vi } from "vitest";
import type { ObstacleSpec, ObstacleView } from "../../shared/world";
import { withObstacleCue } from "./obstacle-cue";

it("labels jumpable and solid obstacles without changing the release point", () => {
  const text = vi.fn((..._args: unknown[]) => ({ setOrigin: vi.fn() }));
  const container = vi.fn((..._args: unknown[]) => undefined);
  const scene = { add: { text, container } } as unknown as Phaser.Scene;
  const view = { x: 640, y: 220, setPosition: vi.fn() } as unknown as ObstacleView;
  const spec: ObstacleSpec = {
    kind: "hurdle",
    lane: 1,
    jumpable: true,
    effect: "end-run",
    height: 30,
  };
  withObstacleCue(scene, view, spec);
  expect(text.mock.calls[0][2]).toContain("JUMP");
  expect(container.mock.calls[0].slice(0, 2)).toEqual([640, 220]);
  withObstacleCue(scene, view, { ...spec, kind: "barrier", jumpable: false });
  expect(text.mock.calls[1][2]).toContain("DODGE");
});
