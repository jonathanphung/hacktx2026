import type Phaser from "phaser";
import { expect, it, vi } from "vitest";
import { createObstacleView } from "./obstacle-view";
import { obstacleArtLayout } from "../../shell/supplied-assets";

it("keeps fireball dimensions equal to collision layout throughout its opacity pulse", () => {
  const art = { setDisplaySize: vi.fn().mockReturnThis() };
  const view = { setDepth: vi.fn().mockReturnThis(), once: vi.fn() };
  const addTween = vi.fn();
  const scene = {
    data: { get: () => "humpty" },
    textures: {
      exists: () => true,
      get: () => ({ getSourceImage: () => ({ width: 92, height: 249 }) }),
    },
    add: { image: vi.fn(() => art), container: vi.fn(() => view) },
    tweens: { add: addTween },
  } as unknown as Phaser.Scene;
  createObstacleView(scene, 640, 220, "fireball", 64, 72);
  const bounds = obstacleArtLayout("fireball", 64, 72, 92 / 249);
  expect(art.setDisplaySize).toHaveBeenCalledWith(bounds.width, bounds.height);
  expect(addTween).toHaveBeenCalledTimes(1);
  const tween = addTween.mock.calls[0][0];
  expect(tween).toMatchObject({ targets: art, alpha: 0.8 });
  for (const property of ["scale", "scaleX", "scaleY", "width", "height"])
    expect(tween).not.toHaveProperty(property);
});
