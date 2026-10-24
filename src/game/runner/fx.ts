import Phaser from "phaser";

interface Puff {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  age: number;
  life: number;
  grow: number;
}

interface Ghost {
  img: Phaser.GameObjects.Image;
  age: number;
}

const PUFF_LIFE = 0.45;
const GHOST_LIFE = 0.14;

/**
 * Cosmetic effects for the runner: dust puffs and lane-change afterimages. Objects come from
 * fixed pools and are recycled, so effects never allocate mid-run or leak across restarts.
 */
export class RunnerFx {
  private puffs: Puff[] = [];
  private ghosts: Ghost[] = [];
  private nextPuff = 0;
  private nextGhost = 0;

  constructor(scene: Phaser.Scene) {
    if (!scene.textures.exists("fx-dust")) {
      const g = scene.make.graphics({}, false);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 8);
      g.generateTexture("fx-dust", 16, 16);
      g.destroy();
    }
    for (let i = 0; i < 40; i++) {
      const img = scene.add.image(0, 0, "fx-dust").setDepth(8).setVisible(false);
      this.puffs.push({ img, vx: 0, vy: 0, age: 0, life: 0, grow: 0 });
    }
    for (let i = 0; i < 6; i++) {
      const img = scene.add.image(0, 0, "fx-dust").setDepth(9.5).setVisible(false);
      this.ghosts.push({ img, age: GHOST_LIFE });
    }
  }

  /** Dust at (x, y). `spread` = sideways burst speed; `trackSpeed` carries it down the screen. */
  dust(
    x: number,
    y: number,
    count: number,
    spread: number,
    trackSpeed: number,
    size = 1,
    tint = 0xc5c5e0,
  ) {
    for (let i = 0; i < count; i++) {
      const p = this.puffs[this.nextPuff];
      this.nextPuff = (this.nextPuff + 1) % this.puffs.length;
      const angle = count > 1 ? (i / count) * Math.PI * 2 : Math.PI / 2 + (Math.random() - 0.5);
      p.vx = Math.cos(angle) * spread;
      p.vy = Math.sin(angle) * spread * 0.5 + trackSpeed * 0.85;
      p.age = 0;
      p.life = PUFF_LIFE * (0.8 + Math.random() * 0.4);
      p.grow = size;
      p.img
        .setPosition(x + (Math.random() - 0.5) * 6, y)
        .setTint(tint)
        .setVisible(true);
    }
  }

  /** A fading copy of the runner's current frame (used while changing lanes fast). */
  ghost(source: Phaser.GameObjects.Sprite) {
    const g = this.ghosts[this.nextGhost];
    this.nextGhost = (this.nextGhost + 1) % this.ghosts.length;
    g.age = 0;
    g.img
      .setTexture(source.texture.key)
      .setPosition(source.x, source.y)
      .setScale(source.scaleX, source.scaleY)
      .setAngle(source.angle)
      .setTint(0x81d4fa)
      .setVisible(true);
  }

  update(dt: number) {
    for (const p of this.puffs) {
      if (!p.img.visible) continue;
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) {
        p.img.setVisible(false);
        continue;
      }
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      p.vx *= 0.9;
      p.img.setScale((0.35 + 0.55 * k) * p.grow).setAlpha(0.45 * (1 - k));
    }
    for (const g of this.ghosts) {
      if (!g.img.visible) continue;
      g.age += dt;
      if (g.age >= GHOST_LIFE) g.img.setVisible(false);
      else g.img.setAlpha(0.35 * (1 - g.age / GHOST_LIFE));
    }
  }
}
