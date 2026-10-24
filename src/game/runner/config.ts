/** Runner tuning. Speeds in px/second; the playfield is 1280x720. */
export const RUNNER = {
  laneSpacing: 170,
  runnerY: 610,
  runnerSize: 60,
  /** Collision box, a bit smaller than the drawn runner so near-misses feel fair. */
  hitboxSize: 48,
  /** Gesture input lags ~200-300 ms behind a keyboard, so start slower than Subway Surfers. */
  baseSpeed: 260,
  /** Speed added per second survived, up to the cap set by `minWarningMs`. */
  accel: 6,
  /**
   * Shortest time an obstacle is on screen before it reaches the runner, at top speed.
   * Dodging by gesture needs ~0.5-0.7 s (reaction + gesture detection + lane switch), so keep a margin.
   * This caps the speed; see speed.ts.
   */
  minWarningMs: 1000,
  laneSwitchMs: 110,
  jumpMs: 650,
  slowFactor: 0.5,
  slowMs: 2000,
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
