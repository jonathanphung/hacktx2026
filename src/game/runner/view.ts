import Phaser from "phaser";
import type { PowerupKind } from "../../shared/world";
import { POWERUPS, RUNNER } from "./config";
import { jumpHeight } from "./motion";

const RUN_FRAMES = 4;
const TEX = 64;

const COLORS = {
  skin: 0xf1c27d,
  hair: 0x3b2a1a,
  shirt: 0x4fc3f7,
  stripe: 0xffffff,
  pants: 0x283593,
  shoes: 0x212121,
};

/**
 * Draws one top-down frame of the runner (facing up the track) into a texture.
 * `phase` in [-1, 1] swings legs and arms in opposition; null = tucked jump pose.
 */
function drawFrame(scene: Phaser.Scene, key: string, phase: number | null) {
  const g = scene.make.graphics({}, false);
  const swing = (phase ?? 0) * 9;
  const tuck = phase === null;

  // Legs (behind the torso), then shoes at the ends.
  g.fillStyle(COLORS.pants);
  g.fillRoundedRect(23, 34 - (tuck ? 4 : swing), 8, tuck ? 12 : 18, 4);
  g.fillRoundedRect(33, 34 + (tuck ? -4 : swing), 8, tuck ? 12 : 18, 4);
  g.fillStyle(COLORS.shoes);
  g.fillEllipse(27, (tuck ? 42 : 50) - (tuck ? 0 : swing), 9, 6);
  g.fillEllipse(37, (tuck ? 42 : 50) + (tuck ? 0 : swing), 9, 6);

  // Arms swing opposite to the legs; raised when jumping.
  g.fillStyle(COLORS.skin);
  g.fillRoundedRect(12, (tuck ? 14 : 24) + swing * 0.8, 7, 15, 3.5);
  g.fillRoundedRect(45, (tuck ? 14 : 24) - swing * 0.8, 7, 15, 3.5);

  // Torso with a racing stripe.
  g.fillStyle(COLORS.shirt);
  g.fillRoundedRect(17, 22, 30, 20, 8);
  g.fillStyle(COLORS.stripe);
  g.fillRect(30, 22, 4, 20);

  // Head: mostly hair from above, a bit of face toward the top of the frame.
  g.fillStyle(COLORS.skin);
  g.fillCircle(32, 18, 9);
  g.fillStyle(COLORS.hair);
  g.fillCircle(32, 20, 8);

  g.generateTexture(key, TEX, TEX);
  g.destroy();
}

/** Creates the runner textures and animation once per game (they survive scene restarts). */
function ensureAssets(scene: Phaser.Scene) {
  if (scene.textures.exists("runner-jump")) return;
  for (let i = 0; i < RUN_FRAMES; i++) {
    drawFrame(scene, `runner-run-${i}`, Math.sin((i / RUN_FRAMES) * Math.PI * 2));
  }
  drawFrame(scene, "runner-jump", null);
  scene.anims.create({
    key: "runner-run",
    frames: Array.from({ length: RUN_FRAMES }, (_, i) => ({ key: `runner-run-${i}` })),
    frameRate: 10,
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

  constructor(
    private scene: Phaser.Scene,
    x: number,
    private groundY: number,
  ) {
    ensureAssets(scene);
    this.baseScale = RUNNER.runnerSize / 48; // the drawn figure is ~48px tall in its 64px frame
    this.shadow = scene.add.ellipse(x, groundY + 6, 44, 22, 0x000000, 0.55).setDepth(9);
    this.sprite = scene.add
      .sprite(x, groundY, "runner-run-0")
      .setScale(this.baseScale)
      .setDepth(10);
    this.sprite.play("runner-run");
    this.shield = scene.add
      .circle(x, groundY, RUNNER.runnerSize * 0.75)
      .setStrokeStyle(3, 0x80deea)
      .setDepth(11)
      .setVisible(false);
  }

  /** Draws the pose. `time` is the game clock in ms. */
  render(pose: RunnerPose, time: number) {
    if (this.crashed) return;
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

    shadow.setPosition(pose.x, this.groundY + 6);
    shadow.setScale(1 - 0.4 * h).setAlpha(0.55 - 0.3 * h);
    shield.setPosition(pose.x, sprite.y);
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
    this.scene.cameras.main.shake(200, 0.01);
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
