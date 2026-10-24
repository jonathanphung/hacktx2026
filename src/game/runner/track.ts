import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, LANES, type Lane } from "../../shared/types";
import { RUNNER } from "./config";

/** Three living stems. Lane centers, collisions, and scrolling remain unchanged. */
export function createTrack(scene: Phaser.Scene, laneX: (lane: Lane) => number) {
  const sky = scene.add.graphics().setDepth(-2);
  sky.fillGradientStyle(0x6966a6, 0xa48fc7, 0xbde5ce, 0xf6d6d9, 1);
  sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  for (const [x, y] of [
    [95, 130],
    [1160, 240],
    [140, 510],
    [1170, 650],
  ]) {
    sky.fillStyle(0xfdf4ff, 0.6);
    sky.fillEllipse(x, y, 260, 65);
    sky.fillEllipse(x - 50, y - 20, 110, 65);
    sky.fillEllipse(x + 35, y - 25, 130, 70);
  }
  for (let i = 0; i < 26; i++) {
    const x = (i * 193 + 41) % GAME_WIDTH;
    if (x > 350 && x < 930) continue;
    const spark = scene.add
      .circle(x, (i * 137 + 30) % GAME_HEIGHT, (i % 3) + 1, 0xffefb1, 0.8)
      .setDepth(-1);
    scene.tweens.add({
      targets: spark,
      alpha: 0.2,
      duration: 900 + i * 47,
      yoyo: true,
      repeat: -1,
    });
  }
  const key = "enchanted-stem";
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    const width = RUNNER.laneSpacing;
    const cx = width / 2;
    g.fillStyle(0x244d3d);
    g.fillRect(cx - 62, 0, 124, 256);
    g.fillStyle(0x4e8850);
    g.fillRect(cx - 55, 0, 110, 256);
    g.fillStyle(0x7fb266);
    g.fillRect(cx - 38, 0, 76, 256);
    g.fillStyle(0x9bc87a, 0.5);
    g.fillRect(cx - 21, 0, 20, 256);
    for (let y = 0; y < 256; y += 8) {
      g.fillStyle(0xb8d98c, 0.65);
      g.fillCircle(cx + Math.sin((y / 256) * Math.PI * 2) * 40, y, 5);
    }
    for (const [y, dir] of [
      [64, -1],
      [192, 1],
    ]) {
      g.fillStyle(0x3f7b49);
      g.fillEllipse(cx + dir * 48, y, 70, 38);
      g.lineStyle(2, 0xb7d583, 0.7);
      g.lineBetween(cx, y + 10, cx + dir * 75, y - 3);
    }
    // An illuminated rune between the leaf platforms.
    g.lineStyle(2, 0xffedab, 0.85);
    g.strokeRect(cx - 8, 120, 16, 16);
    g.fillStyle(0xffedab, 0.8);
    g.fillRect(cx - 2, 115, 4, 26);
    g.fillRect(cx - 13, 126, 26, 4);
    g.generateTexture(key, width, 256);
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    g.destroy();
  }
  const stems = LANES.map((lane) =>
    scene.add
      .tileSprite(laneX(lane), GAME_HEIGHT / 2, RUNNER.laneSpacing, GAME_HEIGHT, key)
      .setDepth(0),
  );

  // Speed lines: faint streaks that fade in as the track gets fast.
  const left = laneX(0) - RUNNER.laneSpacing / 2;
  const width = RUNNER.laneSpacing * 3;
  const streaks = Array.from({ length: 14 }, () =>
    scene.add
      .rectangle(left + Math.random() * width, Math.random() * GAME_HEIGHT, 2, 60, 0xffffff)
      .setDepth(1)
      .setAlpha(0),
  );

  return {
    /** Scrolls the markings and speed lines for one frame at `speed` px/s. */
    update(dt: number, speed: number) {
      const dy = speed * dt;
      for (const stem of stems) stem.tilePositionY -= dy;
      const alpha = Phaser.Math.Clamp((speed - RUNNER.streakFromSpeed) / 250, 0, 1) * 0.22;
      for (const s of streaks) {
        s.y += dy * 1.7;
        if (s.y > GAME_HEIGHT + 40) s.setPosition(left + Math.random() * width, -40);
        s.setAlpha(alpha);
      }
    },
  };
}
