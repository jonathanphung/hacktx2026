# Active hazards and defensive pickups

Built on current main, retaining countdown tale scoring, Slow Drain, the compact
HUD, all snare behavior, AI modes, story sequences and supplied beanstalk artwork.
Human input, movement/jump controllers and vision/model files are unchanged.

- **Fireball** accelerates down its chosen stem with a flame trail. It never homes
  across lanes. Maximum speed respects the combined hand wind-up/travel reaction
  budget of 1 second, including when the track reaches its cap.
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

272 unit tests and 3 AI server tests pass, along with format, typecheck and build.
Tests cover reaction budgets, acceleration/slow/freeze behavior, swept contacts,
clean-jump reward eligibility, Blast cleanup, new effect expiry and exact 1.25x
cooldown/refill timing, including refresh without stacking. Browser checks cover
actual icon rendering, real pickup collection, the Giant Slow HUD/countdown, and
sandbox attack spawns. Human webcam gameplay tuning remains a playtest task.

Before syncing, the scrapped uncommitted art was preserved in the Git stash named
“Preserve scrapped local beanstalk artwork before gameplay sync.” Main's current
artwork is used instead; those local originals were not discarded.
