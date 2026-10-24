import Phaser from "phaser";
import { GAME_HEIGHT, LANES, type Lane } from "../../shared/types";
import { RUNNER } from "./config";

/** Three lane strips with dashed dividers that scroll with the world speed. */
export function createTrack(scene: Phaser.Scene, laneX: (lane: Lane) => number) {
  const half = RUNNER.laneSpacing / 2;
  const g = scene.add.graphics().setDepth(0);
  for (const lane of LANES) {
    g.fillStyle(lane === 1 ? 0x2a2a48 : 0x24243e);
    g.fillRect(laneX(lane) - half, 0, RUNNER.laneSpacing, GAME_HEIGHT);
  }
  // Solid track edges.
  g.fillStyle(0x5c5c8a);
  g.fillRect(laneX(0) - half - 4, 0, 4, GAME_HEIGHT);
  g.fillRect(laneX(2) + half, 0, 4, GAME_HEIGHT);

  if (!scene.textures.exists("lane-dash")) {
    const d = scene.make.graphics({}, false);
    d.fillStyle(0x5c5c8a);
    d.fillRect(0, 0, 4, 40);
    d.generateTexture("lane-dash", 4, 80); // 40px dash, 40px gap
    d.destroy();
  }
  const dividers = [laneX(0) + half, laneX(1) + half].map((x) =>
    scene.add.tileSprite(x, GAME_HEIGHT / 2, 4, GAME_HEIGHT, "lane-dash").setDepth(1),
  );

  return {
    /** Move the markings down the screen by `dy` px. */
    scroll(dy: number) {
      for (const d of dividers) d.tilePositionY -= dy;
    },
  };
}
