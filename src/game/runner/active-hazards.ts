import { GIANT_RELEASE_Y, GIANT_WINDUP_MS } from "../../shared/combat";
import { RUNNER } from "./config";

/** Different motion, same aim lane. Worst-case combined warning remains at least one second. */
export function hazardSpeed(
  kind: string,
  ageMs: number,
  trackSpeed: number,
  timeScale = 1,
): number {
  if (kind !== "fireball" && kind !== "hurdle") return trackSpeed;
  const height = kind === "fireball" ? 72 : 24;
  const distance = RUNNER.runnerY - GIANT_RELEASE_Y - (height + RUNNER.hitboxSize) / 2;
  const safeCap = distance / ((RUNNER.minWarningMs - GIANT_WINDUP_MS) / 1000);
  const ramp = Math.max(0, Math.min(1, ageMs / (kind === "fireball" ? 600 : 800)));
  const factor = kind === "fireball" ? 1.15 + 0.5 * ramp : 1.05 + 0.3 * ramp;
  return Math.min(
    trackSpeed * factor,
    Math.min(safeCap, kind === "fireball" ? 550 : 500) * timeScale,
  );
}
/** Swept vertical collision prevents a fast projectile skipping through the hit band. */
export function crossesRunner(previousY: number, nextY: number, height: number): boolean {
  const half = (height + RUNNER.hitboxSize) / 2;
  return (
    Math.min(previousY, nextY) - half < RUNNER.runnerY &&
    Math.max(previousY, nextY) + half > RUNNER.runnerY
  );
}
export class HazardMotion {
  ageMs = 0;
  velocity = 0;
  private jumped = false;
  private rewarded = false;
  constructor(readonly kind: string) {}
  advance(y: number, dt: number, speed: number, scale: number, frozen: boolean): number {
    if (frozen) {
      this.velocity = 0;
      return y;
    }
    this.ageMs += Math.max(0, dt) * 1000 * scale;
    this.velocity = hazardSpeed(this.kind, this.ageMs, speed, scale);
    return y + this.velocity * Math.max(0, dt);
  }
  noteJump(inBand: boolean, airborne: boolean) {
    if (this.kind === "hurdle" && inBand && airborne) this.jumped = true;
  }
  /** Only after the whole log clears the hitbox, never for a dodge or shield hit. */
  cleanJumpPoints(y: number, height: number, touched: boolean): number {
    if (this.rewarded || y <= RUNNER.runnerY + (height + RUNNER.hitboxSize) / 2) return 0;
    this.rewarded = true;
    return this.jumped && !touched ? 50 : 0;
  }
}
