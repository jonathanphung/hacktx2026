import { RUNNER } from "./config";

/** Travel from fingertip release to contact with the largest lethal obstacle (fireball). */
export const WARNING_DISTANCE = RUNNER.runnerY - RUNNER.hitboxSize / 2 - 110 - 36;

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
