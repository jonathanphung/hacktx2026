# Practice, readable magic, and a predictable giant rotation

A review branch for playtesting onboarding and visual changes together.

- Start normally and choose **Learn to play · practice grove**. Webcam events or
  A/D/W and J/K/L/Enter work. Practice is a separate scene with safe retries, no
  lives or score loss. Learn dodging, a timed jump, a shield pickup, giant aiming,
  casting a Barrier and then the next object (a Hurdle). Practice can be skipped;
  either route continues into the existing story cinematic.
- On title and replay screens, a hand movement from either player activates the
  default begin button. Finger waves, horizontal/vertical moves and changes in
  hand size count after an initial tracked frame. Small jitter and initial hand
  appearance alone do not start. Each screen has a fresh baseline. This shell-only
  listener uses VisionHandle.onFrame and emits no game inputs. Enter/click and
  the existing runner-jump shortcut also remain available.
- Pickups have a shield silhouette, hourglass or 2× glyph, halo and full name.
  Active HUD badges show effect and remaining duration. Decoration does not
  enlarge the pickup hitbox. Shield consumption removes its badge immediately.
- Moving **↑ JUMP** / **↔ DODGE** badges derive directly from each obstacle's actual
  jumpability, covering natural hazards and giant attacks. Collision dimensions
  and logic are unchanged. Labels are destroyed with the obstacle.
- The giant follows **Barrier → Hurdle → Oil → Mud → Fireball → repeat**. The
  NEXT DROPS panel shows four actual future objects, with stocked vs on-deck
  labels. The same rotation feeds both starting stock, refills and capacity
  upgrades, so previewing never consumes or reshuffles draws. A rejected fist
  never advances it. Existing warning time, targeting and recharge rules remain.
  The feint feature and its key/button/gesture plans have been removed.

## Verification

Formatting, typecheck, all 218 tests and production build pass. Rotation tests
cover multiple laps, non-consuming forecasts, blocked draws, refills, capacity
upgrades and real cast ordering. Menu tests cover each player, both axes, finger
waves, jitter, dropout, one-shot triggering, unsubscribe and fresh menu baselines.
The practice mechanics were exercised with keyboard controls in the browser. The
new preview and cast progression are also checked in the browser. Human webcam
playtesting remains necessary, especially at different distances; no distance
normalization changes are part of this experiment.

Vision/model files, shared contracts, keyboard mappings and runner movement,
jumping and collision logic are unchanged. The runner runtime diff only wraps
spawned obstacle visuals with instruction badges. Existing story, growing stock,
relic effects and teammates' work remain in place.
