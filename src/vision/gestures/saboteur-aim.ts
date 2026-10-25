import type { Lane } from "../../shared/types";
import { LaneAim } from "./aim";

type Step = "left" | "right";
/** Saboteur only: absolute camera-zone changes win; within-zone swipes can step the target. */
export class SaboteurAim {
  private position = new LaneAim(0.025);
  private target: Lane = 1;
  private lastX: number | null = null;
  private lastTime = -Infinity;
  private lastSpeed = 0;
  private direction = 0;
  private crossed = false;
  private stepped = false;
  private stillAnchor: number | null = null;
  private stillSince = 0;
  private needsSync = false;

  get current() {
    return this.target;
  }
  set(lane: Lane): Lane | null {
    if (lane === this.target) return null;
    this.target = lane;
    return lane;
  }
  resetMotion() {
    this.lastX = null;
    this.direction = 0;
    this.crossed = false;
    this.stepped = false;
    this.stillAnchor = null;
    this.lastSpeed = 0;
  }
  resumePosition() {
    this.resetMotion();
    this.needsSync = true;
  }

  push(t: number, x: number | null, step: Step | null, pointed = false): Lane | null {
    if (!Number.isFinite(t)) return null;
    if (t <= this.lastTime || t - this.lastTime > 220) this.resumePosition();
    const dt = t - this.lastTime;
    this.lastTime = t;
    if (x === null || !Number.isFinite(x)) {
      this.resumePosition();
      return null;
    }
    if (this.lastX !== null && dt > 0) {
      const delta = x - this.lastX;
      const speed = Math.abs(delta) / (dt / 1000);
      const direction = Math.abs(delta) > 0.012 ? Math.sign(delta) : 0;
      const newStroke = direction && this.direction && direction !== this.direction;
      const accelerates = speed > 0.8 && this.lastSpeed < 0.3;
      if (newStroke || accelerates) {
        this.crossed = false;
        this.stepped = false;
      }
      if (direction) this.direction = direction;
      this.lastSpeed = speed;
    }
    this.lastX = x;
    if (this.stillAnchor === null || Math.abs(x - this.stillAnchor) > 0.015) {
      this.stillAnchor = x;
      this.stillSince = t;
    } else if (t - this.stillSince >= 70) {
      this.crossed = false;
      this.stepped = false;
    }
    let target = this.target;
    const zone = this.position.push(x);
    if (zone !== null || this.needsSync) {
      target = this.position.current;
      this.needsSync = false;
      if (zone !== null) this.crossed = true;
    }
    if (step) {
      // A single cross-column swipe must not also add a second lane change.
      if (pointed || (!this.crossed && !this.stepped)) {
        target = Math.max(0, Math.min(2, target + (step === "left" ? -1 : 1))) as Lane;
      }
      this.stepped = true;
    }
    return this.set(target);
  }
}
