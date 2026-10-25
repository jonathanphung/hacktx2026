# Active hazards and defensive pickups

Built on current main, retaining countdown tale scoring, Slow Drain, the compact
HUD, all snare behavior, AI modes, story sequences and supplied beanstalk artwork.
Human input, movement/jump controllers and vision/model files are unchanged.

- **Fireball** accelerates down its chosen stem with a flame trail. It never homes
  across lanes. Maximum speed respects the combined hand wind-up/travel reaction
  budget of at least 1.2 seconds in actual play, including when the track reaches its cap.
- **Rolling Log** accelerates more gently, with rolling grain tied to actual
  travel, so it visually stops during a time freeze. It remains jumpable. A clean
  jump restores up to 50 points to the current tale's pot, capped at its original
  value. Dodging, shield contact and repeated frames cannot farm that reward.
- **Blast** has a bomb-and-spark icon and clears all active obstacles plus the
  deferred obstacle backlog, with a burst on each threat. Treasures, other pickups,
  the runner and the giant's future stock remain. It is instant, not a timed buff.
- **Giant Slow** has a giant-face-and-clock icon. For 8 seconds both cast spacing
  and inventory recharge take 1.25 times as long. Remaining cooldown time is
  rescaled on activation and expiry; another pickup refreshes duration without
  multiplying the effect again. The giant sees a cooldown multiplier indicator.
- Existing Shield, Slow Time and Slow Drain remain. Slow Time also supplies a
  450 ms freeze/safety window before continuing its normal slowdown. Projectile
  speeds and acceleration slow too. There is no 2x score pickup: the latest main
  already repurposed its legacy `double` identifier as Slow Drain, which is kept.

The new vector icons are self-hosted and shared by the actual pickups, HUD and
practice guide. The existing art style and halo treatment remain. They add no
model inference or network dependency.

AI observations use actual individual obstacle speeds (zero while frozen) through
prerequisite contract PR #69, preserving legacy snapshots through track-speed
fallback. Fast hazards use swept vertical contact checks to avoid tunneling.

## Playtest

`/?novision&combat-preview` opens a development-only sandbox with real spawns and
pickup collection, unlimited tries and launch/pickup buttons. Move with A/D/W or
remove `novision` for hands. This is isolated from the normal title flow and all
sandbox logic is removed from production builds. The ordinary game uses the same
mechanics with normal damage, spawning and progression.

## Validation

277 unit tests and 3 AI server tests pass, along with format, typecheck and build.
Tests cover reaction budgets, acceleration/slow/freeze behavior, swept contacts,
clean-jump reward eligibility, Blast cleanup, new effect expiry and exact 1.25x
cooldown/refill timing, including refresh without stacking. Browser checks cover
actual icon rendering, real pickup collection, the Giant Slow HUD/countdown, and
sandbox attack spawns. Human webcam gameplay tuning remains a playtest task.

Before syncing, the scrapped uncommitted art was preserved in the Git stash named
“Preserve scrapped local beanstalk artwork before gameplay sync.” Main's current
artwork is used instead; those local originals were not discarded.

## Balance pass before merge

Giant stock refills every 3 seconds (20/min sustained). Saved stock uses a 2-second
minimum cast gap, raised from 1.7 seconds. Giant Slow multiplies both by 1.25, to
3.75 seconds and 2.5 seconds. Wind-up is 600 ms, raised from 400 ms to retain at
least 1.2 seconds from the hand warning through first contact for the faster
projectiles. Flight speed is retained. Natural waves keep their existing stage
ramp from 4.5 to 1.7 seconds, subject to entrance, story and spawn-safety holds.

The mixed-wave guard now compares conservative contact-time windows, not just
whether obstacles are near the top. It prevents a fast fireball closing the last
escape stem while older slower rocks are still dangerous, and treats frozen
threats conservatively. Powerups keep their 8-second spawn cadence but draw from
a shuffled bag: each five-spawn cycle contains Shield, Slow Time, Slow Drain,
Blast and Giant Slow exactly once. Collection still requires reaching the stem.

Simulation tests cover both fast attacks across 30/60/120 fps, all stage speed
bands and Slow Time, plus the mixed-speed and frozen-triple-lane regressions.
Clean-jump rewards remain below passive tale drain even under the fastest attack
rotation and Slow Drain. These are mechanical fairness checks, not measured human
win rates; final webcam difficulty still benefits from human playtests.
