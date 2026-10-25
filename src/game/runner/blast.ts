/** Clear only obstacle collections; stage treasures, pickups and the runner are never passed here. */
export function detonate<T extends { view: { x: number; y: number; destroy(): void } }>(
  obstacles: T[],
  waiting: unknown[],
  burst: (x: number, y: number) => void,
): number {
  const count = obstacles.length;
  for (const obstacle of obstacles) {
    burst(obstacle.view.x, obstacle.view.y);
    obstacle.view.destroy();
  }
  obstacles.length = 0;
  waiting.length = 0;
  return count;
}
