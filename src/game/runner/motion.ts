/**
 * Critically damped spring: the fastest motion to a target with no overshoot. Unlike a tween,
 * changing the target mid-move keeps the current velocity, so quick swipes chain smoothly.
 */
export class Spring {
  velocity = 0;

  /** @param omega stiffness in rad/s; the move is ~55% done at 1.85/omega s, ~95% at 4.74/omega s. */
  constructor(
    public value: number,
    public target: number,
    private omega: number,
  ) {}

  /** Advances by `dt` seconds (exact solution, stable for any dt). */
  step(dt: number, omega = this.omega): number {
    const w = omega;
    const x0 = this.value - this.target;
    const v0 = this.velocity;
    const e = Math.exp(-w * dt);
    const c = v0 + w * x0;
    this.value = this.target + (x0 + c * dt) * e;
    this.velocity = (v0 - w * c * dt) * e;
    return this.value;
  }
}

/** Jump height profile for progress p in [0, 1]: 0 on the ground, 1 at the apex (parabola). */
export const jumpHeight = (p: number) => (p <= 0 || p >= 1 ? 0 : 4 * p * (1 - p));
