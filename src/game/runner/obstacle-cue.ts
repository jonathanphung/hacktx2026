import type Phaser from "phaser";
import type { ObstacleSpec, ObstacleView } from "../../shared/world";
import { obstacleAdvice } from "../../shell/game-guide";

/** Visual wrapper only: the obstacle's world position and collision dimensions stay intact. */
export function withObstacleCue(scene: Phaser.Scene, view: ObstacleView, spec: ObstacleSpec) {
  const advice = obstacleAdvice(spec.jumpable);
  const badge = scene.add
    .text(0, -(spec.height ?? 40) / 2 - 16, advice.label, {
      fontFamily: "Courier New, monospace",
      fontSize: "15px",
      fontStyle: "bold",
      color: advice.color,
      backgroundColor: "#201a32",
      padding: { x: 7, y: 4 },
    })
    .setOrigin(0.5);
  const x = view.x,
    y = view.y;
  view.setPosition(0, 0);
  return scene.add.container(x, y, [view, badge]);
}
