import { GIANT_RELEASE_Y } from "../../shared/combat";
import type Phaser from "phaser";

/** Local, self-hosted fantasy art; bounds match each obstacle's collision dimensions. */
export function createObstacleView(
  scene: Phaser.Scene,
  x: number,
  y: number,
  kind: string,
  width: number,
  height: number,
  held = false,
) {
  const g = scene.add.graphics();
  const w = width / 2,
    h = height / 2;
  if (kind === "barrier" || kind === "double-wall") {
    g.fillStyle(0x302940);
    g.fillRoundedRect(-w, -h, width, height, 8);
    g.fillStyle(0x75677f);
    g.fillRoundedRect(-w + 3, -h + 3, width - 6, height - 8, 7);
    g.fillStyle(0xa898ae);
    g.fillRect(-w + 9, -h + 5, width - 18, 5);
    g.lineStyle(2, 0x493b58);
    g.lineBetween(-w + 30, -h + 10, -w + 22, h - 7);
    g.lineBetween(w - 25, -h + 7, w - 40, h - 6);
    g.lineStyle(3, 0xdac1ff);
    g.strokeRect(-10, -10, 20, 20);
    g.lineBetween(0, -15, 0, 15);
    g.lineBetween(-15, 0, 15, 0);
    g.fillStyle(0x81b879);
    g.fillRect(-w + 7, h - 9, 24, 6);
    g.fillRect(w - 35, h - 10, 28, 6);
  } else if (kind === "hurdle") {
    g.fillStyle(0x483029);
    g.fillRoundedRect(-w, -h, width, height, 8);
    g.fillStyle(0x9d7147);
    g.fillRoundedRect(-w + 3, -h + 3, width - 6, height - 6, 6);
    g.fillStyle(0xd5ac72);
    g.fillEllipse(-w + 10, 0, 15, height - 5);
    g.fillEllipse(w - 10, 0, 15, height - 5);
    g.lineStyle(2, 0x66432e);
    g.lineBetween(-w + 23, -3, w - 23, -3);
    g.lineBetween(-w + 27, 4, w - 20, 4);
    g.fillStyle(0x4a7e54);
    for (let i = -1; i <= 1; i++)
      g.fillTriangle(i * 30 - 8, -h + 3, i * 30, -h - 6, i * 30 + 8, -h + 3);
  } else if (kind === "oil") {
    g.fillStyle(0x352248);
    g.fillEllipse(0, 1, width, height);
    g.fillStyle(0x8856b2);
    g.fillEllipse(-8, -2, width * 0.8, height * 0.8);
    g.fillStyle(0xb582d3);
    g.fillEllipse(-w * 0.35, -h * 0.25, width * 0.33, height * 0.22);
    g.lineStyle(2, 0xe1befa);
    g.strokeCircle(w * 0.35, -h * 0.2, 5);
    g.strokeCircle(-w * 0.15, h * 0.2, 3);
    g.fillStyle(0xc6f2ca);
    g.fillRect(-3, -h * 0.4, 6, 13);
    g.fillRect(-7, -h * 0.1, 14, 5);
  } else if (kind === "mud") {
    g.fillStyle(0x493c39);
    g.fillRoundedRect(-w, -h, width, height, 14);
    g.fillStyle(0x775744);
    g.fillRoundedRect(-w + 4, -h + 4, width - 8, height - 8, 12);
    for (let i = 0; i < 4; i++) {
      const yy = -h + 15 + (i * (height - 24)) / 4;
      g.lineStyle(6, 0xb49264);
      g.lineBetween(-w + 7, yy, w * 0.25, yy + 12);
      g.lineBetween(w * 0.25, yy + 12, w - 7, yy - 5);
      g.lineStyle(2, 0xdaad78);
      g.lineBetween(-w + 10, yy - 2, w * 0.25, yy + 10);
    }
    g.fillStyle(0x7eaf6b);
    g.fillEllipse(-w + 13, -h + 12, 22, 10);
    g.fillEllipse(w - 15, h - 15, 22, 10);
  } else if (kind === "fireball") {
    g.fillStyle(0xff6935, 0.25);
    g.fillCircle(0, 8, w);
    g.fillStyle(0xbd3543);
    g.fillTriangle(-w, 10, -w * 0.3, -h, w, 12);
    g.fillStyle(0xff6d31);
    g.fillCircle(0, 9, w * 0.82);
    g.fillTriangle(-w * 0.7, 4, w * 0.1, -h, w * 0.7, 9);
    g.fillStyle(0xffbd52);
    g.fillCircle(0, 12, w * 0.6);
    g.fillTriangle(-w * 0.4, 10, 0, -h * 0.65, w * 0.4, 10);
    g.fillStyle(0xfff2a3);
    g.fillCircle(0, 15, w * 0.32);
  } else {
    g.fillStyle(0x2e4560);
    g.fillTriangle(0, -h, -w, 0, 0, h);
    g.fillTriangle(0, -h, w, 0, 0, h);
    g.fillStyle(0x9af5e9);
    g.fillTriangle(0, -h + 2, -w + 4, 0, 0, h - 2);
    g.fillStyle(0x6b8fda);
    g.fillTriangle(0, -h + 2, w - 4, 0, 0, h - 2);
    g.lineStyle(2, 0xe0ffec);
    g.lineBetween(-w + 5, 0, w - 5, 0);
    g.lineBetween(0, -h, 0, h);
  }
  // Released objects begin at the fingertips, rather than popping in above the screen.
  const view = scene.add.container(x, held ? y : GIANT_RELEASE_Y, [g]).setDepth(6);
  if (kind === "fireball") {
    scene.tweens.add({
      targets: g,
      scaleX: 1.1,
      alpha: 0.8,
      duration: 120,
      yoyo: true,
      repeat: -1,
    });
    view.once("destroy", () => scene.tweens.killTweensOf(g));
  }
  if (!held) {
    view.setScale(0.85);
    scene.tweens.add({ targets: view, scale: 1, duration: 120 });
  }
  return view;
}
