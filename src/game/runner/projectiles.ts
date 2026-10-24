import { GAME_HEIGHT } from "../../shared/types";

interface LingeringObstacle {
  spec: { kind: string };
  view: { y: number; destroy(): void };
  h: number;
}
/** Fireballs finish crossing the road during the game-over transition. */
export function finishFireballs<T extends LingeringObstacle>(
  obstacles: T[],
  deltaMs: number,
  speed: number,
): void {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    if (obstacle.spec.kind !== "fireball") continue;
    obstacle.view.y += (Math.max(speed, 360) * deltaMs) / 1000;
    if (obstacle.view.y > GAME_HEIGHT + obstacle.h) {
      obstacle.view.destroy();
      obstacles.splice(i, 1);
    }
  }
}
