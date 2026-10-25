/** Runner tuning. Speeds in px/second; the playfield is 1280x720. */
export const RUNNER = {
  laneSpacing: 170,
  runnerY: 610,
  /** Drawn size; collisions use hitboxSize, so this is purely visual. */
  runnerSize: 68,
  /** Collision box, a bit smaller than the drawn runner so near-misses feel fair. */
  hitboxSize: 48,
  /**
   * Starting speed. Gesture input lags ~150-350 ms behind a keyboard (see minWarningMs), so
   * start slow. Later speeds come from the stage bands in stage-tuning.ts.
   */
  baseSpeed: 260,
  /**
   * Shortest combined hand telegraph and obstacle travel time before contact, at top speed.
   * This caps the speed; see speed.ts. Budget for a dodge (2026-10-24):
   * - hand starts moving -> runner fully in the new lane: ~325 ms for a typical 250 ms swipe,
   *   ~450 ms for a slow one. Measured through the real vision interpreter + game at 29 fps,
   *   plus ~45 ms capture/inference from the vision benchmark; no live camera yet. Measured at
   *   the default swipe distance (0.2); vision calibration can lower it, which detects sooner.
   * - seeing the obstacle and choosing a direction: ~350-450 ms (typical human reaction).
   * Total ~0.7-0.9 s, so 1.0 s leaves ~100-300 ms margin. Raise this if playtesters with
   * slow swipes keep getting hit at top speed.
   */
  minWarningMs: 1000,
  /**
   * Lane-change spring stiffness (rad/s). 42 clears an obstacle's lane in ~45 ms and settles
   * in ~115 ms with no overshoot (motion.test.ts). Higher = snappier, lower = floatier.
   */
  laneOmega: 42,
  /** Lean angle (degrees) per px/s of sideways speed; peaks around 16 degrees. */
  leanPerSpeed: 0.0062,
  jumpMs: 650,
  /** A jump sent this close to landing is kept and fires on landing (instead of being lost). */
  jumpBufferMs: 150,
  /** Speed lines start fading in above this track speed (px/s). */
  streakFromSpeed: 340,
  /** Mud/sap reduce lateral responsiveness, never the world's travel speed. */
  slowFactor: 0.65,
  slowMs: 2000,
  blockGraceMs: 400,
};

/** Powerup tuning. One random powerup spawns in a random lane every `everyMs`. */
export const POWERUPS = {
  everyMs: 8000,
  size: 44,
  /** Shield lasts until it absorbs a hit, or this long. */
  shieldMs: 8000,
  slowmoMs: 4000,
  slowmoFactor: 0.6,
  doubleMs: 6000,
};
