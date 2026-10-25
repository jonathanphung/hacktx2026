import { GIANT_RELEASE_Y } from "../../shared/combat";
import { createObstacleView } from "./obstacle-view";
import type Phaser from "phaser";

/** One reaching hand per attack, so rapid throws can overlap without snapping. */
export function createGiantHand(
  scene: Phaser.Scene,
  x: number,
  color: number,
  warningMs: number,
  kind = "barrier",
) {
  const hand = scene.add.container(x, -230).setDepth(25);
  const g = scene.add.graphics();
  // Pixel-edged purple sleeve, gold cuff, palm, curled fingers, and thumb.
  g.fillStyle(0x332245);
  g.fillRect(-52, -100, 104, 148);
  g.fillStyle(0x6b477d);
  g.fillRect(-44, -100, 88, 148);
  g.fillStyle(0xcfa65f);
  g.fillRect(-56, 32, 112, 20);
  g.fillStyle(0xffdfa0);
  g.fillRect(-48, 36, 96, 5);
  g.fillStyle(0x805039);
  g.fillRoundedRect(-55, 49, 110, 88, 14);
  g.fillStyle(0xb9855b);
  g.fillRoundedRect(-48, 50, 96, 78, 12);
  for (let i = 0; i < 4; i++) {
    g.fillStyle(0x805039);
    g.fillRoundedRect(-51 + i * 27, 103, 25, 65 - (i % 2) * 7, 9);
    g.fillStyle(0xc9956b);
    g.fillRoundedRect(-47 + i * 27, 104, 18, 53 - (i % 2) * 7, 7);
    g.fillStyle(0xe8bd92);
    g.fillRect(-44 + i * 27, 143 - (i % 2) * 7, 12, 8);
  }
  g.fillStyle(0x805039);
  g.fillRoundedRect(37, 69, 35, 61, 12);
  g.fillStyle(0xc9956b);
  g.fillRoundedRect(38, 71, 27, 51, 10);
  const spell = createObstacleView(
    scene,
    0,
    143,
    kind,
    105,
    kind === "mud" ? 70 : 40,
    true,
  ).setScale(0.55);
  hand.add([g, spell]);
  scene.tweens.add({
    targets: hand,
    y: GIANT_RELEASE_Y - 143,
    duration: warningMs * 0.7,
    ease: "Back.easeOut",
  });
  let finished = false;
  const destroy = () => {
    if (finished) return;
    finished = true;
    scene.tweens.killTweensOf(hand);
    hand.destroy();
  };
  const onShutdown = () => destroy();
  scene.events.once("shutdown", onShutdown);
  return {
    release() {
      if (finished) return;
      scene.tweens.killTweensOf(hand);
      // Open the grip and let the held obstacle visibly fall before the arm retracts.
      spell.setVisible(false);
      scene.tweens.add({ targets: g, scaleX: 1.15, duration: 90, yoyo: true });
      // A short impact ring marks the throw; the real obstacle handles gameplay.
      const ring = scene.add.circle(x, GIANT_RELEASE_Y, 20).setStrokeStyle(4, color).setDepth(24);
      scene.tweens.add({
        targets: ring,
        scale: 2.3,
        alpha: 0,
        duration: 260,
        onComplete: () => ring.destroy(),
      });
      scene.tweens.add({
        targets: hand,
        y: -270,
        angle: -8,
        duration: 280,
        ease: "Cubic.easeIn",
        onComplete: () => {
          scene.events.off("shutdown", onShutdown);
          destroy();
        },
      });
    },
    destroy() {
      scene.events.off("shutdown", onShutdown);
      destroy();
    },
  };
}
