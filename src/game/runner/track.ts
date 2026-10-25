import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, LANES, type Lane } from "../../shared/types";
import { RUNNER } from "./config";
import { STAGE_TUNING, type StageTuning } from "./stage-tuning";

type Sky = readonly [number, number, number, number];

/** Blends two 0xRRGGBB colors; t in [0, 1]. */
export function lerpColor(a: number, b: number, t: number): number {
  const ch = (shift: number) =>
    Math.round(((a >> shift) & 0xff) + (((b >> shift) & 0xff) - ((a >> shift) & 0xff)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

const STEM_FILE_KEY = "beanstalk-stem";
/** The tile is drawn at 2x for crispness; shown at half size. */
const STEM_TILE_SCALE = 0.5;

/** Loads the pixel-art beanstalk tile; createTrack falls back to drawn stems if it is missing. */
export function preloadTrackAssets(scene: Phaser.Scene) {
  scene.load.image(STEM_FILE_KEY, `${import.meta.env.BASE_URL}assets/beanstalk/player-stem-v3.png`);
}

/** Three living stems. Lane centers, collisions, and scrolling remain unchanged. */
export function createTrack(scene: Phaser.Scene, laneX: (lane: Lane) => number) {
  // Sky gradient (redrawn while blending between stages) with clouds on top.
  const sky = scene.add.graphics().setDepth(-2.1);
  const drawSky = (c: Sky) => {
    sky.clear();
    sky.fillGradientStyle(c[0], c[1], c[2], c[3], 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  };
  let skyNow: Sky = STAGE_TUNING.humpty.sky;
  drawSky(skyNow);
  const clouds = scene.add.graphics().setDepth(-2);
  for (const [x, y] of [
    [95, 130],
    [1160, 240],
    [140, 510],
    [1170, 650],
  ]) {
    clouds.fillStyle(0xfdf4ff, 0.6);
    clouds.fillEllipse(x, y, 260, 65);
    clouds.fillEllipse(x - 50, y - 20, 110, 65);
    clouds.fillEllipse(x + 35, y - 25, 130, 70);
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
  const hasArt = scene.textures.exists(STEM_FILE_KEY);
  const key = hasArt ? STEM_FILE_KEY : "enchanted-stem";
  if (hasArt) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  else if (!scene.textures.exists(key)) {
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
      .setTileScale(hasArt ? STEM_TILE_SCALE : 1)
      .setDepth(0),
  );
  if (hasArt) {
    const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
    for (const stem of stems)
      stem.tilePositionX = (source.width - RUNNER.laneSpacing / STEM_TILE_SCALE) / 2;
  }
  // Tile positions are in texture pixels, so a scaled tile must scroll proportionally faster.
  const scroll = 1 / (hasArt ? STEM_TILE_SCALE : 1);

  // Speed lines: faint streaks that fade in as the track gets fast.
  const left = laneX(0) - RUNNER.laneSpacing / 2;
  const width = RUNNER.laneSpacing * 3;
  const streaks = Array.from({ length: 14 }, () =>
    scene.add
      .rectangle(left + Math.random() * width, Math.random() * GAME_HEIGHT, 2, 60, 0xffffff)
      .setDepth(1)
      .setAlpha(0),
  );

  // Stage palette blend state.
  let stemNow = 0xffffff;
  let blend: {
    fromSky: Sky;
    toSky: Sky;
    fromStem: number;
    toStem: number;
    t: number;
    ms: number;
  } | null = null;

  // Stage gates: a banner with the stage name that scrolls down the track.
  const gates: Phaser.GameObjects.Container[] = [];

  return {
    /** Blends the sky and stems into a stage's palette over `ms`. */
    setStage(tuning: StageTuning, ms: number) {
      blend = {
        fromSky: skyNow,
        toSky: tuning.sky,
        fromStem: stemNow,
        toStem: tuning.stemTint,
        t: 0,
        ms,
      };
    },

    /** Sends a stage gate down the track. It reaches the runner about when the calm ends. */
    announce(name: string) {
      const w = RUNNER.laneSpacing * 3 + 40;
      const plank = scene.add.rectangle(0, 0, w, 54, 0x3b2a5c, 0.92).setStrokeStyle(4, 0xffe08a);
      const posts = [-w / 2, w / 2].map((x) => scene.add.rectangle(x, 0, 14, 90, 0x6b4f2a));
      const label = scene.add
        .text(0, 0, name.toUpperCase(), {
          fontFamily: "Courier New, monospace",
          fontSize: "26px",
          fontStyle: "bold",
          color: "#ffe08a",
        })
        .setOrigin(0.5);
      gates.push(scene.add.container(GAME_WIDTH / 2, -60, [...posts, plank, label]).setDepth(7));
    },

    /** Scrolls the markings and speed lines for one frame at `speed` px/s. */
    update(dt: number, speed: number) {
      const dy = speed * dt;
      if (blend) {
        blend.t = Math.min(1, blend.t + (dt * 1000) / blend.ms);
        const { fromSky: a, toSky: b, t } = blend;
        skyNow = [0, 1, 2, 3].map((i) => lerpColor(a[i], b[i], t)) as unknown as Sky;
        drawSky(skyNow);
        stemNow = lerpColor(blend.fromStem, blend.toStem, t);
        for (const stem of stems) stem.setTint(stemNow);
        if (t >= 1) blend = null;
      }
      for (let i = gates.length - 1; i >= 0; i--) {
        gates[i].y += dy;
        if (gates[i].y > GAME_HEIGHT + 80) gates.splice(i, 1)[0].destroy();
      }
      for (const stem of stems) stem.tilePositionY -= dy * scroll;
      const alpha = Phaser.Math.Clamp((speed - RUNNER.streakFromSpeed) / 250, 0, 1) * 0.22;
      for (const s of streaks) {
        s.y += dy * 1.7;
        if (s.y > GAME_HEIGHT + 40) s.setPosition(left + Math.random() * width, -40);
        s.setAlpha(alpha);
      }
    },
  };
}
