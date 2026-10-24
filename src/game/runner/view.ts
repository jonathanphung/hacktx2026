import Phaser from "phaser";
import { RUNNER } from "./config";

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

/**
 * The runner's visuals: an animated sprite plus a ground shadow. Purely cosmetic — the game
 * logic tracks lane/airborne state itself and tells the view what to show.
 */
export class RunnerView {
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  private shield: Phaser.GameObjects.Arc;
  private crashed = false;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    private groundY: number,
  ) {
    ensureAssets(scene);
    const scale = RUNNER.runnerSize / 48; // the drawn figure is ~48px tall inside its 64px frame
    this.shadow = scene.add.ellipse(x, groundY + 6, 44, 22, 0x000000, 0.55).setDepth(9);
    this.sprite = scene.add.sprite(x, groundY, "runner-run-0").setScale(scale).setDepth(10);
    this.sprite.play("runner-run");
    this.shield = scene.add
      .circle(x, groundY, RUNNER.runnerSize * 0.75)
      .setStrokeStyle(3, 0x80deea)
      .setDepth(11)
      .setVisible(false);
  }

  get x() {
    return this.sprite.x;
  }

  /** Keeps the run cycle in step with the track speed. */
  setSpeed(pxPerSec: number) {
    this.sprite.anims.timeScale = pxPerSec / RUNNER.baseSpeed;
  }

  moveTo(x: number, direction: -1 | 1) {
    const duration = RUNNER.laneSwitchMs;
    this.scene.tweens.add({ targets: [this.sprite, this.shadow, this.shield], x, duration });
    // Lean into the move, then straighten up.
    this.scene.tweens.add({
      targets: this.sprite,
      angle: direction * 14,
      duration: duration / 2,
      yoyo: true,
    });
  }

  jump(durationMs: number) {
    const base = this.sprite.scale;
    this.sprite.setTexture("runner-jump");
    this.sprite.anims.pause();
    const half = durationMs / 2;
    // Rise toward the camera (bigger, slightly up the screen); the shadow stays on the ground.
    this.scene.tweens.add({
      targets: this.sprite,
      scale: base * 1.35,
      y: this.groundY - 14,
      duration: half,
      ease: "Sine.easeOut",
      yoyo: true,
      onComplete: () => {
        if (this.crashed) return;
        this.sprite.setScale(base).setY(this.groundY);
        this.sprite.play("runner-run");
      },
    });
    this.scene.tweens.add({
      targets: this.shadow,
      scale: 0.6,
      alpha: 0.25,
      duration: half,
      ease: "Sine.easeOut",
      yoyo: true,
    });
  }

  /** Brief purple wobble when slowed (e.g. oil). */
  slowed() {
    this.sprite.setTint(0xb39ddb);
    this.scene.tweens.add({
      targets: this.sprite,
      angle: { from: -8, to: 8 },
      duration: 90,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        if (!this.crashed) this.sprite.setAngle(0).clearTint();
      },
    });
  }

  setShield(on: boolean) {
    this.shield.setVisible(on);
  }

  /** Knocked down: flash red, spin and fade, with a camera shake. */
  crash() {
    this.crashed = true;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.anims.stop();
    this.sprite.setTint(0xff5252);
    this.scene.cameras.main.shake(200, 0.01);
    this.scene.tweens.add({
      targets: this.sprite,
      angle: 200,
      alpha: 0.4,
      scale: this.sprite.scale * 0.8,
      duration: 500,
      ease: "Cubic.easeOut",
    });
  }
}
