import { RUNNER } from "./config";

/** Distance an obstacle travels from spawning (top edge) to touching the runner's hitbox. */
export const WARNING_DISTANCE = RUNNER.runnerY - RUNNER.hitboxSize / 2;

/** Top track speed: the fastest speed that still gives `minWarningMs` to react. */
export const MAX_SPEED = WARNING_DISTANCE / (RUNNER.minWarningMs / 1000);

/** Track speed after `elapsedSec` seconds, before powerup/obstacle multipliers. */
export function speedAt(elapsedSec: number): number {
  return Math.min(RUNNER.baseSpeed + elapsedSec * RUNNER.accel, MAX_SPEED);
}

/** How long an obstacle is visible before reaching the runner at `speed` px/s. */
export function warningMs(speed: number): number {
  return (WARNING_DISTANCE / speed) * 1000;
}
