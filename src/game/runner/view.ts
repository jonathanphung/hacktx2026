import Phaser from "phaser";
import type { StageItemId } from "../../shared/stages";
import type { PowerupKind } from "../../shared/world";
import { POWERUPS, RUNNER } from "./config";
import { RunnerFx } from "./fx";
import { jumpHeight } from "./motion";

const RUN_FRAMES = 16;
const S = 2;
const TEX = 128;
/** Visible character height in the 128px animation frames. */
const FIGURE = 48;

export function preloadRunnerAssets(scene: Phaser.Scene) {
  const base = `${import.meta.env.BASE_URL}assets/runner/`;
  scene.load.image("runner-sheet", `${base}jon-run.png`);
  scene.load.image("runner-jump", `${base}jon-jump.png`);
  scene.load.image("runner-sheet-left", `${base}jon-run-left.png`);
  scene.load.image("runner-sheet-right", `${base}jon-run-right.png`);
}

/** Creates the runner textures and animation once per game (they survive scene restarts). */
function ensureAssets(scene: Phaser.Scene) {
  if (scene.anims.exists("runner-run")) return;
  for (const direction of ["", "-left", "-right"]) {
    const sheet = scene.textures
      .get(`runner-sheet${direction}`)
      .getSourceImage() as HTMLImageElement;
    for (let i = 0; i < RUN_FRAMES; i++) {
      const texture = scene.textures.createCanvas(`runner-run${direction}-${i}`, TEX, TEX)!;
      texture.context.drawImage(sheet, i * TEX, 0, TEX, TEX, 0, 0, TEX, TEX);
      texture.refresh();
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
  scene.textures.get("runner-jump").setFilter(Phaser.Textures.FilterMode.NEAREST);
  const spark = scene.make.graphics({}, false);
  spark.fillStyle(0xffedb0);
  spark.fillRect(3, 0, 2, 8);
  spark.fillRect(0, 3, 8, 2);
  spark.generateTexture("wizard-spark", 8, 8);
  spark.destroy();
  scene.textures.get("wizard-spark").setFilter(Phaser.Textures.FilterMode.NEAREST);
  scene.anims.create({
    key: "runner-run",
    frames: Array.from({ length: RUN_FRAMES }, (_, i) => ({ key: `runner-run-${i}` })),
    frameRate: 1000 / 60,
    repeat: -1,
  });
}

/** What the view needs each frame. Game logic owns the state; the view only draws it. */
export interface RunnerPose {
  x: number;
  /** Sideways velocity in px/s (drives the lean). */
  vx: number;
  /** Jump progress 0..1, or null on the ground. */
  jump: number | null;
  slowed: boolean;
  /** Track speed in px/s (drives the run cycle). */
  speed: number;
}

/** How long the landing squash lasts. */
const LAND_MS = 110;

/**
 * The runner's visuals: an animated sprite plus a ground shadow, drawn from a `RunnerPose`
 * every frame. No tweens for movement, so overlapping inputs can't fight each other.
 */
export class RunnerView {
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  private shield: Phaser.GameObjects.Arc;
  private crashed = false;
  private baseScale: number;
  private wasAirborne = false;
  private landedAt = -Infinity;
  private fx: RunnerFx;
  private lastFrameKey = "";
  private lastGhostAt = -Infinity;
  private magic: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    private groundY: number,
  ) {
    ensureAssets(scene);
    this.baseScale = RUNNER.runnerSize / (FIGURE * S);
    this.shadow = scene.add.ellipse(x, groundY + 6, 44, 22, 0x000000, 0.55).setDepth(9);
    this.sprite = scene.add
      .sprite(x, groundY, "runner-run-0")
      .setScale(this.baseScale)
      .setDepth(10);
    this.sprite.play("runner-run");
    this.fx = new RunnerFx(scene);
    this.magic = scene.add
      .particles(0, 0, "wizard-spark", {
        follow: this.sprite,
        followOffset: { x: 0, y: 18 },
        frequency: 100,
        lifespan: 450,
        speed: { min: 8, max: 25 },
        angle: { min: 60, max: 120 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.8, end: 0 },
        blendMode: "ADD",
        quantity: 1,
      })
      .setDepth(9);
    this.shield = scene.add
      .circle(x, groundY, RUNNER.runnerSize * 0.75)
      .setStrokeStyle(3, 0x80deea)
      .setDepth(11)
      .setVisible(false);
  }

  /** Draws the pose. `time` is the game clock in ms; `dt` the frame time in seconds. */
  render(pose: RunnerPose, time: number, dt: number) {
    if (this.crashed) return;
    this.fx.update(dt);
    const { sprite, shadow, shield } = this;
    const airborne = pose.jump !== null;
    const h = airborne ? jumpHeight(pose.jump!) : 0;

    // Takeoff / landing: swap between the run cycle and the tucked jump pose.
    if (airborne && !this.wasAirborne) {
      this.magic.emitParticleAt(pose.x, this.groundY, 14);
      sprite.anims.pause();
      sprite.setTexture("runner-jump");
    } else if (!airborne && this.wasAirborne) {
      sprite.play("runner-run");
      this.landedAt = time;
      this.fx.dust(pose.x, this.groundY + this.unit * 20, 8, 150, pose.speed, 1.3);
    }
    this.wasAirborne = airborne;
    sprite.anims.timeScale = pose.speed / RUNNER.baseSpeed;
    if (!airborne) {
      // Choose cape art without restarting the underlying leg animation.
      const frame = sprite.anims.currentFrame?.textureKey.replace("runner-run-", "") ?? "0";
      const direction = pose.vx < -40 ? "-left" : pose.vx > 40 ? "-right" : "";
      sprite.setTexture(`runner-run${direction}-${frame}`);
    }

    // Squash & stretch: stretch on the way up, squash briefly on landing.
    let sx = 1;
    let sy = 1;
    if (airborne && pose.jump! < 0.25) {
      const k = 1 - pose.jump! / 0.25;
      sx -= 0.08 * k;
      sy += 0.12 * k;
    }
    const sinceLand = time - this.landedAt;
    if (sinceLand < LAND_MS) {
      const k = 1 - sinceLand / LAND_MS;
      sx += 0.14 * k;
      sy -= 0.12 * k;
    }
    // Jumping = rising toward the camera: bigger and slightly up the screen.
    const grow = 1 + 0.35 * h;
    sprite.setScale(this.baseScale * grow * sx, this.baseScale * grow * sy);
    sprite.setPosition(pose.x, this.groundY - 32 * h);

    const lean = Phaser.Math.Clamp(pose.vx * RUNNER.leanPerSpeed, -18, 18);
    const wobble = pose.slowed ? Math.sin(time / 45) * 7 : 0;
    sprite.setAngle(lean + wobble);
    if (pose.slowed) sprite.setTint(0xb39ddb);
    else sprite.clearTint();

    // Footstep dust from the push-off foot, on the two stride frames of the run cycle.
    const frameKey = airborne ? "" : (sprite.anims.currentFrame?.textureKey ?? "");
    if (frameKey !== this.lastFrameKey) {
      const frame = Number(frameKey.replace("runner-run-", ""));
      const side = frameKey && frame % 8 === 2 ? 1 : frameKey && frame % 8 === 6 ? -1 : 0;
      if (side) {
        const foot = { x: pose.x + side * 5.5 * this.unit, y: this.groundY + 27 * this.unit };
        this.fx.dust(foot.x, foot.y, 1, 25, pose.speed);
      }
      this.lastFrameKey = frameKey;
    }
    // Afterimages while changing lanes fast.
    if (Math.abs(pose.vx) > 900 && time - this.lastGhostAt > 30) {
      this.fx.ghost(sprite);
      this.lastGhostAt = time;
    }

    shadow.setPosition(pose.x, this.groundY + 6);
    shadow.setScale(1 - 0.4 * h).setAlpha(0.55 - 0.3 * h);
    shield.setPosition(pose.x, sprite.y);
  }

  /** Screen px per frame unit of the drawn figure. */
  private get unit() {
    return this.baseScale * S;
  }

  setShield(on: boolean) {
    this.shield.setVisible(on);
  }

  /** A stage item was collected: a golden sparkle burst around the runner. */
  celebrate(trackSpeed: number) {
    this.fx.dust(this.sprite.x, this.sprite.y, 12, 220, trackSpeed * 0.3, 1.1, 0xffe08a);
    this.scene.cameras.main.flash(120, 255, 236, 170);
  }

  /** The shield just absorbed a hit: cyan flash. */
  shieldBlocked() {
    this.scene.cameras.main.flash(150, 128, 222, 234);
  }

  /** Knocked down: flash red, spin and fade, with a camera shake. */
  crash() {
    this.crashed = true;
    this.sprite.anims.stop();
    this.sprite.setTint(0xff5252);
    const cam = this.scene.cameras.main;
    cam.shake(200, 0.01);
    // Zoom punch on impact, then ease back. Chain on the complete event: starting a zoom from
    // inside the first zoom's update callback gets cancelled when that effect finishes.
    cam.once(Phaser.Cameras.Scene2D.Events.ZOOM_COMPLETE, () =>
      cam.zoomTo(1, 260, "Quad.easeInOut", true),
    );
    cam.zoomTo(1.06, 90, "Quad.easeOut", true);
    this.scene.tweens.add({
      targets: this.sprite,
      angle: this.sprite.angle + 200,
      alpha: 0.4,
      scale: this.baseScale * 0.8,
      duration: 500,
      ease: "Cubic.easeOut",
    });
  }
}

const PICKUP_STYLE: Record<PowerupKind, { color: number; label: string }> = {
  shield: { color: 0x26c6da, label: "S" },
  slowmo: { color: 0xffee58, label: "⏱" },
  double: { color: 0x66bb6a, label: "x2" },
};

/** A collectible powerup: a glowing coin with a label. */
export function createPickupView(scene: Phaser.Scene, x: number, y: number, kind: PowerupKind) {
  const { color, label } = PICKUP_STYLE[kind];
  const r = POWERUPS.size / 2;
  const glow = scene.add.circle(0, 0, r + 6, color, 0.25);
  const coin = scene.add.circle(0, 0, r, color).setStrokeStyle(3, 0xffffff);
  const text = scene.add
    .text(0, 0, label, { fontFamily: "system-ui, sans-serif", fontSize: "20px", color: "#1b1b2f" })
    .setOrigin(0.5);
  const view = scene.add.container(x, y, [glow, coin, text]).setDepth(5);
  scene.tweens.add({
    targets: glow,
    scale: 1.3,
    alpha: 0.1,
    duration: 500,
    yoyo: true,
    repeat: -1,
  });
  return view;
}

/** Draws a stage's key item centered at (0, 0), about 40 px tall. */
function drawStageItem(g: Phaser.GameObjects.Graphics, item: StageItemId) {
  const ink = 0x14142b;
  switch (item) {
    case "egg": // Humpty's egg: speckled, with a crack
      g.fillStyle(ink).fillEllipse(0, 0, 34, 44);
      g.fillStyle(0xfff6e0).fillEllipse(0, 0, 30, 40);
      g.fillStyle(0xffffff, 0.8).fillEllipse(-6, -8, 9, 13);
      g.fillStyle(0xd9c79a);
      for (const [x, y] of [
        [6, -4],
        [-5, 8],
        [8, 9],
        [-9, -1],
      ])
        g.fillCircle(x, y, 2);
      g.lineStyle(2, ink).beginPath();
      g.moveTo(-8, -1).lineTo(-3, 3).lineTo(1, -2).lineTo(5, 3).strokePath();
      break;
    case "potion": // "Drink Me": round bottle, cork, paper tag
      g.fillStyle(ink).fillCircle(0, 6, 17).fillRect(-7, -20, 14, 16);
      g.fillStyle(0xe8f4ff).fillCircle(0, 6, 15).fillRect(-5, -18, 10, 14);
      g.fillStyle(0xb388ff).fillCircle(0, 9, 12);
      g.fillStyle(0xffffff, 0.7).fillCircle(-6, 2, 3);
      g.fillStyle(0xa0703c).fillRect(-6, -24, 12, 7);
      g.fillStyle(0xfff3c4).fillRect(6, -10, 16, 9);
      g.lineStyle(1, ink).strokeRect(6, -10, 16, 9);
      break;
    case "slipper": {
      // Cinderella's glass slipper, side view: pointed toe left, high heel right.
      const shoe = [
        [-23, 9],
        [-19, 3],
        [-6, 1],
        [4, -2],
        [12, -11],
        [20, -13],
        [23, -6],
        [21, 4],
        [16, 9],
        [-20, 13],
      ].map(([x, y]) => new Phaser.Math.Vector2(x, y));
      const grow = (k: number) => shoe.map((v) => new Phaser.Math.Vector2(v.x * k, v.y * k + 1));
      g.fillStyle(ink).fillPoints(grow(1.12), true);
      g.fillStyle(ink).fillTriangle(13, 7, 22, 7, 19, 22);
      g.fillStyle(0xcfe8ff, 0.95).fillPoints(shoe, true);
      g.fillStyle(0xa9d4ff).fillTriangle(15, 8, 20, 8, 18.5, 19);
      g.fillStyle(0x7fb3e6).fillEllipse(9, -4, 16, 6); // the opening
      g.fillStyle(0xffffff, 0.85).fillEllipse(-10, 5, 14, 3); // glassy shine
      g.fillStyle(0xffffff)
        .fillTriangle(-14, -14, -12, -6, -10, -14)
        .fillTriangle(-16, -10, -12, -8, -8, -10);
      break;
    }
    case "trident": // the sea king's trident: gold shaft, three prongs
      g.fillStyle(ink).fillRect(-3, -14, 6, 36).fillRect(-15, -12, 30, 6);
      g.fillStyle(0xffd54f).fillRect(-2, -13, 4, 34).fillRect(-14, -11, 28, 4);
      for (const x of [-13, 0, 13]) {
        g.fillStyle(ink).fillTriangle(x - 4, -10, x, -24, x + 4, -10);
        g.fillStyle(0xffe082).fillTriangle(x - 2.5, -11, x, -21, x + 2.5, -11);
      }
      g.fillStyle(0x4dd0e1).fillCircle(0, -9, 3);
      break;
    case "hood": // Red Riding Hood's cloak: hood over a flowing cape
      g.fillStyle(ink).fillTriangle(-20, 22, 20, 22, 0, -14).fillCircle(0, -10, 13);
      g.fillStyle(0xd32f2f).fillTriangle(-17, 20, 17, 20, 0, -11).fillCircle(0, -10, 11);
      g.fillStyle(0x8e1c1c).fillCircle(0, -7, 6);
      g.fillStyle(0xffcdd2, 0.6).fillTriangle(-8, 18, -2, 18, -4, 0);
      break;
  }
}

/** The stage's key item on the track: halo, bobbing art, and a "GRAB" label. */
export function createStageItemView(
  scene: Phaser.Scene,
  x: number,
  y: number,
  item: StageItemId,
  name: string,
) {
  const halo = scene.add.circle(0, 0, 34, 0xffe08a, 0.35).setStrokeStyle(3, 0xffffff, 0.9);
  const art = scene.add.graphics();
  drawStageItem(art, item);
  const label = scene.add
    .text(0, -54, `GRAB THE ${name.toUpperCase()}!`, {
      fontFamily: "Courier New, monospace",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffe08a",
      backgroundColor: "#2b1f45cc",
      padding: { x: 6, y: 3 },
    })
    .setOrigin(0.5);
  const view = scene.add.container(x, y, [halo, art, label]).setDepth(6);
  scene.tweens.add({
    targets: halo,
    scale: 1.25,
    alpha: 0.15,
    duration: 450,
    yoyo: true,
    repeat: -1,
  });
  scene.tweens.add({
    targets: art,
    y: -5,
    duration: 380,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  return view;
}
