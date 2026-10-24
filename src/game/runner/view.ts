import Phaser from "phaser";
import type { PowerupKind } from "../../shared/world";
import { POWERUPS, RUNNER } from "./config";
import { jumpHeight } from "./motion";

const RUN_FRAMES = 8;
/** Textures are drawn at 2x so the runner stays crisp when the game is scaled up. */
const S = 2;
const TEX = 64 * S;
/** Height of the drawn figure inside its frame, in frame units (before the 2x). */
const FIGURE = 48;

const C = {
  outline: 0x14142b,
  skin: 0xf1c27d,
  skinShade: 0xd9a066,
  hair: 0x3b2a1a,
  hairLight: 0x6d4c33,
  shirt: 0x29b6f6,
  shirtShade: 0x0288d1,
  shirtLight: 0x81d4fa,
  accent: 0xff7043,
  pants: 0x3949ab,
  shoe: 0xfafafa,
  sole: 0xff7043,
};

/** Draws in 64-unit frame coordinates, each shape with a dark outline (cel look). */
class Pen {
  constructor(private g: Phaser.GameObjects.Graphics) {}
  private o = 1.4; // outline width in frame units
  rr(x: number, y: number, w: number, h: number, r: number, color: number, outline = true) {
    const o = this.o;
    if (outline) {
      this.g.fillStyle(C.outline);
      this.g.fillRoundedRect(
        (x - o) * S,
        (y - o) * S,
        (w + 2 * o) * S,
        (h + 2 * o) * S,
        (r + o) * S,
      );
    }
    this.g.fillStyle(color);
    this.g.fillRoundedRect(x * S, y * S, w * S, h * S, Math.min(r, w / 2, h / 2) * S);
  }
  circle(x: number, y: number, r: number, color: number, outline = true) {
    if (outline) {
      this.g.fillStyle(C.outline);
      this.g.fillCircle(x * S, y * S, (r + this.o) * S);
    }
    this.g.fillStyle(color);
    this.g.fillCircle(x * S, y * S, r * S);
  }
  ellipse(x: number, y: number, w: number, h: number, color: number, outline = true) {
    if (outline) {
      this.g.fillStyle(C.outline);
      this.g.fillEllipse(x * S, y * S, (w + 2 * this.o) * S, (h + 2 * this.o) * S);
    }
    this.g.fillStyle(color);
    this.g.fillEllipse(x * S, y * S, w * S, h * S);
  }
}

/**
 * Draws one top-down frame of the runner (seen from above and behind, running up the track).
 * `phase` is the run-cycle angle in radians; null draws the airborne pose.
 */
function drawFrame(scene: Phaser.Scene, key: string, phase: number | null) {
  const g = scene.make.graphics({}, false);
  const pen = new Pen(g);
  const air = phase === null;
  const s = air ? 0 : Math.sin(phase); // >0: left leg forward, right arm forward

  // Legs and shoes (behind the torso). A forward foot tucks under the body; a back foot
  // trails lower on screen and shows its sole.
  for (const [x, dir] of [
    [26.5, 1],
    [37.5, -1],
  ] as const) {
    // Forward foot peeks out just below the shirt hem (y 47); back foot trails to y 59.
    const footY = air ? 46 : 53 - dir * s * 6;
    pen.rr(x - 3.5, 37, 7, footY - 37, 3.5, C.pants);
    pen.ellipse(x, footY, 8, 8.5, C.shoe);
    if (!air && dir * s < -0.3) pen.rr(x - 3, footY + 2, 6, 2.2, 1, C.sole, false);
  }

  // Upper body counter-rotates against the legs, as in real running.
  g.save();
  g.translateCanvas(32 * S, 30 * S);
  g.rotateCanvas(-s * 0.12);
  g.translateCanvas(-32 * S, -30 * S);

  // Arms swing opposite to the legs; flung up and out in the air.
  for (const [x, dir] of [
    [15.5, 1],
    [48.5, -1],
  ] as const) {
    const handX = air ? x - dir * 4 : x;
    const handY = air ? 13 : 37 + dir * s * 7;
    const elbowY = air ? 19 : (25 + handY) / 2;
    pen.rr(x - 3.5, 23, 7, elbowY - 21, 3.5, C.shirt); // sleeve
    pen.rr(
      Math.min(x, handX) - 3,
      Math.min(elbowY, handY) - 1,
      6 + Math.abs(handX - x),
      Math.abs(handY - elbowY) + 2,
      3,
      C.skin,
    );
    pen.circle(handX, handY, 3.4, C.skin);
  }

  // Torso: shaded shirt with a light band across the shoulders and a racing stripe.
  pen.rr(17.5, 21, 29, 22, 9, C.shirt);
  g.fillStyle(C.shirtShade);
  g.fillRoundedRect(19 * S, 34 * S, 26 * S, 8 * S, 6 * S);
  g.fillStyle(C.shirtLight);
  g.fillRoundedRect(21 * S, 22.5 * S, 22 * S, 4 * S, 2 * S);
  g.fillStyle(C.accent);
  g.fillRect(30.5 * S, 21.5 * S, 3 * S, 21 * S);
  g.restore();

  // Head: ears, hair with a highlight, and a headband.
  pen.circle(23.3, 19, 2.4, C.skinShade);
  pen.circle(40.7, 19, 2.4, C.skinShade);
  pen.circle(32, 18.5, 9, C.hair);
  g.fillStyle(C.hairLight);
  g.fillEllipse(29 * S, 15.5 * S, 8 * S, 5 * S);
  g.fillStyle(C.accent);
  g.fillRect(23.2 * S, 18 * S, 17.6 * S, 3 * S);

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
