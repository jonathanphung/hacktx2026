import { RUNNER } from "./config";

/** Mud/sap hinder dodging, not obstacle travel or jump input. */
export class Snare {
  private until = 0;
  private nextDodge = 0;
  apply(now: number, durationMs: number): void {
    this.until = now + durationMs;
    this.nextDodge = now;
  }
  active(now: number): boolean {
    return this.until > 0 && now < this.until;
  }
  movementFactor(now: number): number {
    return this.active(now) ? RUNNER.slowFactor : 1;
  }
  allowDodge(now: number): boolean {
    if (!this.active(now)) return true;
    if (now < this.nextDodge) return false;
    this.nextDodge = now + RUNNER.snareDodgeGapMs;
    return true;
  }
}
