import Phaser from "phaser";
import type { PowerupKind } from "../../shared/world";

const FILES: Record<PowerupKind, string> = {
  shield: "forcefieldpickup.png",
  slowmo: "slowtimepickup.png",
  double: "x2pickup.png",
};

export function preloadPickupAssets(scene: Phaser.Scene) {
  for (const [kind, file] of Object.entries(FILES)) {
    scene.load.image(`pickup-source-${kind}`, `${import.meta.env.BASE_URL}assets/pickups/${file}`);
  }
}

/** Strip the supplied white/checkerboard matte once, keeping the colored pixel artwork. */
export function pickupTexture(scene: Phaser.Scene, kind: PowerupKind): string {
  const key = `pickup-${kind}`;
  if (scene.textures.exists(key)) return key;
  const source = scene.textures.get(`pickup-source-${kind}`).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d")!;
  context.drawImage(source, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  let left = canvas.width;
  let top = canvas.height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const [r, g, b] = pixels.data.subarray(i, i + 3);
      // The matte is neutral; gold highlights and cyan sparkles remain colored.
      if (Math.min(r, g, b) > 180 && Math.max(r, g, b) - Math.min(r, g, b) < 28) {
        pixels.data[i + 3] = 0;
      }
      if (pixels.data[i + 3] > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = scene.textures.createCanvas(key, right - left + 1, bottom - top + 1)!;
  texture.context.drawImage(canvas, -left, -top);
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}
