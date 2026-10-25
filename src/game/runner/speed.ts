import { GIANT_RELEASE_Y, GIANT_WINDUP_MS } from "../../shared/combat";
import { RUNNER } from "./config";

/** Travel from fingertip release to contact with the largest lethal obstacle (fireball). */
export const WARNING_DISTANCE = RUNNER.runnerY - RUNNER.hitboxSize / 2 - GIANT_RELEASE_Y - 36;

/** Top track speed: retain the 440px/s track cap and guarantee `minWarningMs` to react. */
export const MAX_SPEED = Math.min(
  440,
  WARNING_DISTANCE / ((RUNNER.minWarningMs - GIANT_WINDUP_MS) / 1000),
);

/** Conservative base telegraph plus travel; live casting adds 200 ms of wind-up. */
export function warningMs(speed: number): number {
  return GIANT_WINDUP_MS + (WARNING_DISTANCE / speed) * 1000;
}
