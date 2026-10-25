# Practice, readable magic, and giant bluffing

A review branch for playtesting the onboarding and visual changes together.

- Start the game normally and choose **Learn to play · practice grove**. Existing
  webcam events or A/D/W and J/K/L/Space work. Practice is a separate scene with
  no lives, score loss, natural hazards, or real attacks. It waits for successful
  dodges, a timed jump, a shield pickup, giant aiming, a cast and a feint.
  Missing a practice object retries it. Entering or skipping practice continues
  into the existing story cinematic. Esc pauses practice too.
- Pickups use a shield silhouette, hourglass or 2× glyph, a halo and a full name.
  Active HUD badges show the effect and remaining duration. Decoration does not
  enlarge the pickup hitbox. Shield consumption removes its badge immediately.
- Every spawned obstacle gets an **↑ JUMP** or **↔ DODGE** badge derived directly
  from `ObstacleSpec.jumpable`. This covers natural hazards and giant attacks;
  artwork is never used to guess jumpability. Dimensions and collision logic stay
  unchanged. Labels travel with the obstacle and are destroyed with it.
- Giant feints use **F** or the on-screen **FEINT** button. They show a fake barrier
  wind-up at the currently aimed lane, vanish after 650 ms, and recharge in 8 s.
  They never spawn an obstacle, consume inventory, or reset the real cast cooldown.
  Timing uses the same pause-adjusted game update clock. Pause, game over and
  scene shutdown prevent casts and clean up the hand and input listeners.
  This experimental action currently requires a key or click; normal webcam
  aiming and fist-to-cast controls are unchanged.

## Verification

Formatting, typecheck, all 214 tests and the production build pass. New feint tests
cover initial readiness, cooldown and wind-up boundaries, target lane, no obstacle
spawn, unaffected normal fire, pause, game-over cancellation and listener cleanup.
The full seven-lesson flow was played with keyboard input in the browser. Retry,
wall-dodge success, jump timing, collecting a shield, aiming, casting, bluffing and
completion were observed. The real game's feint countdown and pause overlay were
also exercised. Human webcam playtesting remains necessary, especially at different
camera distances. No distance-normalization changes are part of this experiment.

Vision/model files, shared contracts, keyboard mappings and runner movement,
jumping and collision logic were compared with the starting main and are unchanged.
Runner runtime changes only wrap spawned obstacle visuals with instruction badges.
The existing story, growing inventory and relic effects remain in place.
