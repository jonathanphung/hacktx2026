import Phaser from "phaser";
import type { PowerupKind } from "../../shared/world";
import { POWERUPS, RUNNER } from "./config";
import { RunnerFx } from "./fx";
import { jumpHeight } from "./motion";

const RUN_FRAMES = 8;
/** Textures are drawn at 2x so the runner stays crisp when the game is scaled up. */
const S = 2;
const TEX = 64 * S;
/** Height of the drawn figure inside its frame, in frame units (before the 2x). */
const FIGURE = 48;

/** Wizard Jack: starry robes, a pointed hat, boots, and a crystal staff. */
function drawFrame(scene: Phaser.Scene, key: string, phase: number | null) {
  const g = scene.make.graphics({}, false);
  g.scaleCanvas(S, S);
  const swing = (phase === null ? 0 : Math.sin(phase)) * 4;
  const tuck = phase === null;
  g.fillStyle(0x31213f);
  g.fillEllipse(25, (tuck ? 51 : 56) + swing, 12, 7);
  g.fillEllipse(39, (tuck ? 51 : 56) - swing, 12, 7);
  g.fillStyle(0x392b70);
  g.fillTriangle(32, 22, 11, 53, 53, 53);
  g.fillStyle(0x8063b7);
  g.fillTriangle(32, 23, 18, 50, 46, 50);
  g.lineStyle(3, 0xf4d789);
  g.lineBetween(15, 52, 49, 52);
  g.lineStyle(3, 0xe7bc62);
  g.lineBetween(22, 37, 42, 37);
  g.fillStyle(0x9b7bce);
  g.fillRoundedRect(9, 29 + swing, 12, 14, 4);
  g.fillRoundedRect(43, 29 - swing, 12, 14, 4);
  g.fillStyle(0xf2cdab);
  g.fillCircle(13, 41 + swing, 4);
  g.fillCircle(51, 41 - swing, 4);
  g.fillCircle(32, 25, 9);
  g.fillStyle(0x61432f);
  g.fillEllipse(32, 27, 17, 8);
  g.fillStyle(0x332257);
  g.fillEllipse(32, 20, 39, 12);
  g.fillStyle(0x7751a3);
  g.fillTriangle(32, 1, 18, 20, 46, 20);
  g.lineStyle(2, 0xe7bc62);
  g.lineBetween(20, 18, 44, 18);
  g.fillStyle(0xffe5a0);
  g.fillCircle(31, 11, 3);
  g.fillStyle(0x7751a3);
  g.fillCircle(33, 10, 3);
  g.lineStyle(3, 0xa17c4e);
  g.lineBetween(55, 19 - swing, 52, 52 - swing);
  g.fillStyle(0x8aefd5, 0.25);
  g.fillCircle(55, 16 - swing, 9);
  g.fillStyle(0xbdfce9);
  g.fillTriangle(55, 8 - swing, 49, 17 - swing, 61, 17 - swing);
  g.fillStyle(0x73c8df);
  g.fillTriangle(55, 24 - swing, 49, 17 - swing, 61, 17 - swing);
  g.fillStyle(0xffe5a0);
  g.fillCircle(29, 42, 1.5);
  g.fillCircle(37, 47, 1.5);
  g.generateTexture(key, TEX, TEX);
  g.destroy();
}
/** Creates the runner textures and animation once per game (they survive scene restarts). */
function ensureAssets(scene: Phaser.Scene) {
  if (scene.textures.exists("runner-jump")) return;
  for (let i = 0; i < RUN_FRAMES; i++) {
    drawFrame(scene, `runner-run-${i}`, (i / RUN_FRAMES) * Math.PI * 2);
  }
  drawFrame(scene, "runner-jump", null);
  scene.anims.create({
    key: "runner-run",
    frames: Array.from({ length: RUN_FRAMES }, (_, i) => ({ key: `runner-run-${i}` })),
    frameRate: 16,
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
      sprite.anims.pause();
      sprite.setTexture("runner-jump");
    } else if (!airborne && this.wasAirborne) {
      sprite.play("runner-run");
      this.landedAt = time;
      this.fx.dust(pose.x, this.groundY + this.unit * 20, 8, 150, pose.speed, 1.3);
    }
    this.wasAirborne = airborne;
    sprite.anims.timeScale = pose.speed / RUNNER.baseSpeed;

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
    sprite.setPosition(pose.x, this.groundY - 14 * h);

    const lean = Phaser.Math.Clamp(pose.vx * RUNNER.leanPerSpeed, -18, 18);
    const wobble = pose.slowed ? Math.sin(time / 45) * 7 : 0;
    sprite.setAngle(lean + wobble);
    if (pose.slowed) sprite.setTint(0xb39ddb);
    else sprite.clearTint();

    // Footstep dust from the push-off foot, on the two stride frames of the run cycle.
    const frameKey = airborne ? "" : (sprite.anims.currentFrame?.textureKey ?? "");
    if (frameKey !== this.lastFrameKey) {
      const side = frameKey === "runner-run-2" ? 1 : frameKey === "runner-run-6" ? -1 : 0;
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
