import type Phaser from "phaser";

export function explosion(scene: Phaser.Scene, x: number, y: number, color = 0xffb8ed) {
  const ring = scene.add.circle(x, y, 20, color, 0.12).setStrokeStyle(3, color).setDepth(12);
  scene.tweens.add({
    targets: ring,
    scale: 3,
    alpha: 0,
    duration: 350,
    onComplete: () => ring.destroy(),
  });
}
export function jumpReward(scene: Phaser.Scene, x: number, y: number, points: number) {
  const text = scene.add
    .text(x, y - 70, `+${points} CLEAN JUMP`, {
      fontFamily: "Courier New, monospace",
      fontSize: "17px",
      fontStyle: "bold",
      color: "#a4ffe3",
      backgroundColor: "#211b36",
      padding: { x: 6, y: 3 },
    })
    .setOrigin(0.5)
    .setDepth(14);
  scene.tweens.add({
    targets: text,
    y: y - 115,
    alpha: 0,
    duration: 850,
    onComplete: () => text.destroy(),
  });
}
