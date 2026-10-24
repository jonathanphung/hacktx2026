/** Runner tuning. Speeds in px/second; the playfield is 1280x720. */
export const RUNNER = {
  laneSpacing: 170,
  runnerY: 610,
  runnerSize: 60,
  /** Collision box, a bit smaller than the drawn runner so near-misses feel fair. */
  hitboxSize: 48,
  /** Gesture input lags ~200-300 ms behind a keyboard, so start slower than Subway Surfers. */
  baseSpeed: 260,
  /** Speed added per second survived. */
  accel: 6,
  laneSwitchMs: 110,
  jumpMs: 650,
  slowFactor: 0.5,
  slowMs: 2000,
};
