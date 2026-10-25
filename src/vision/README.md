# Vision lane

Start the app with `npm run dev`, then open `/vision.html` on localhost. The lab
requires no camera until **Start camera** is pressed. **Stop** releases the camera
and closes both MediaPipe instances. Models and WASM are served locally.

## Controls

Both players share one mirrored camera. The runner uses the left half; the
saboteur uses the right. Landmark 9 (middle finger base) represents palm position.

- Runner: deliberate left/right swipes change lanes; up jumps. Ambiguous diagonal
  strokes are ignored. Down swipes are recognized in the lab only.
- Saboteur: palm x aims with lane hysteresis. Pointing up chooses slot 1, victory
  chooses slot 2, thumbs up chooses slot 3. Selection poses need 180 ms; a fist
  needs 100 ms to fire. Show an open palm for 120 ms to re-arm each pose.
- Circle recognition is experimental and lab-only. A circle may also contain
  directional swipes, so do not use it as a game control until there is a defined
  spell action and a motion arbitration design.

Card selection emits existing zero-based `select` slots; the game decides whether
that slot currently contains a card. Selecting an empty slot does not cycle cards.

## Rehearsal and real data

**Run synthetic rehearsal** feeds generated positions through the same interpreter
as the webcam. It demonstrates all directions, a circle, aiming, three selections,
and a held fist producing one fire. It is not a camera benchmark or evidence of
real-world accuracy. The duplicate landmark positions in the rehearsal are
intentional and are not a realistic hand skeleton.

For actual tuning, start the camera, choose **Record landmarks**, perform isolated
swipes/idle holds/fists at your demo distance, then finish and **Download JSON**.
Only landmarks, gesture labels, player IDs and timestamps are saved locally; no
video is recorded or uploaded. Load the JSON with **Replay JSON** to reproduce
recognition failures. Recordings are capped at 18000 frames. Do not commit personal
recordings without checking them first.

Time the live FPS and tracking distance with both players on the demo laptop.
Synthetic replay FPS measures playback cadence, not inference speed. No live
accuracy, distance, or latency benchmark has been established by these tests.
At very low inference rates (gaps over 180 ms), motion/dwell is deliberately reset
rather than connecting stale positions. Inference now runs in two classic Web Workers, keeping model processing off the
main thread. GPU is attempted first, then CPU. Browsers where worker startup fails
use the visible **main-thread fallback**. Worker scripts, model files, WASM and the
vendor runtime are all local assets. The vendor IIFE is loaded as raw source in a
Blob to prevent the dev server from inserting module imports into a classic worker.
Only one frame per tracker can be in flight. Each player independently processes
the latest available camera frame; runner input never waits for the saboteur. Stop/abort terminates workers and rejects pending work.
Cold inference has a 20-second timeout for shader compilation; later frames have
5 seconds. This keeps failures bounded without accumulating stale frames.

**Benchmark real models** runs both actual models on 60 empty images after one
warm-up frame, without opening the camera. It reports median/p95 round-trip time,
individual model medians, processing cadence, backend and animation frame gaps.
Startup frame gaps are reported separately from steady-state gaps. Results are
specific to this browser/device and to no-hand images; they do not predict tracking
accuracy or gesture latency. CPU/GPU contention can reduce model throughput even
while moving work off the main thread improves animation responsiveness.

Live tracking also reports rolling latency and the fraction of frames with a hand
for each half. Use those numbers with two people at the actual demo distance to
finish the go/no-go measurement in issue #3. Do not mark that issue complete from
the no-camera benchmark alone.

## Implementation and tuning

- `interpreter.ts`: pure frame → game actions, used by live tracking and replay.
- `gestures/swipe.ts`: 300 ms window, 0.2-half-frame minimum travel, 1.35:1 axis
  dominance and 0.75 path efficiency. Three samples spanning at least 24 ms; see
  fast-swipe reliability below for cooldown, rest re-arming and burst checks.
- `gestures/smoothing.ts`: 30 ms time-based aim filter; resets after tracking loss.
  Runner swipes use raw palm positions so this filter adds no swipe delay.
- `gestures/fire.ts`: timestamp-based pose edges; unknown labels and tracking loss
  cannot re-arm a held fist. Static labels below 0.7 confidence are ignored.
- `gestures/circle.ts`: bounded 1600 ms path, signed angular travel, closure,
  minimum extent and discontinuity rejection. No shared contract changes.
- `rehearsal.ts`: generated demo and validated JSON import.

Run `npm test` for deterministic traces at multiple sample rates, idle jitter,
dropouts, pose release, card mapping, circle direction and the full rehearsal.
Run `./scripts/check.sh` before pushing.

## Observed no-camera check (2026-10-24)

The production build was served locally under `/hacktx2026/` and benchmarked in
the Codex in-app browser on this laptop, with both trackers reporting worker/GPU.
For 60 empty frames after warm-up: 29.0 processed fps; round-trip p50 24.6 ms and
p95 34.9 ms; longest steady-state animation frame gap 17.7 ms, with zero gaps over
50 ms. Startup's longest observed gap was 33.6 ms. These are a short local sample,
not a two-person tracking benchmark or a guarantee for Chrome/other laptops.

## Player calibration

Open **Player calibration & sensitivity** in the vision lab. With the live camera
running, choose **Calibrate aim**, then sweep an open palm across a comfortable
horizontal range in the right half for five seconds. Pause briefly at both ends.
The measured range maps to the three aim lanes; the overlay boundaries move with
it. Calibration uses 5th/95th percentiles to ignore isolated outliers. It requires
at least 30 hand frames, 70% visible-hand coverage, no frame gap over 250 ms, and
at least 25% of the half-frame in horizontal reach. Failed or cancelled captures
keep the previous settings. Rehearsal and recording replay cannot calibrate.

**Runner gesture size** offers small (14%), standard (20%), or large (28%) stroke
thresholds. Small strokes reduce travel but may accept more unintended motion;
large strokes require a more deliberate movement. Direction, path-quality and
cooldown protections still apply. Settings updates reset buffered swipes/aim
smoothing, while preserving the fist/card pose latches so a held gesture cannot
fire again just because sensitivity changed.

Only the numeric aim range and swipe threshold are saved in browser local storage,
with schema/range validation and a safe default for corrupt or obsolete entries.
No calibration frames or camera images are persisted. Changes apply immediately
to live vision and replay; replay intentionally uses the current settings for
comparison. Another game tab on the same origin receives changes via a storage
event. Preferences do not transfer between localhost ports, deployment hosts,
or browsers. Storage-blocked browsers retain preferences for the current page
session only. **Reset controls** restores the defaults.

Calibrate again after moving the camera, changing seating or switching players.
This is control-range calibration, not model training or a substitute for testing
real gesture recordings. Issue #4 still needs real, labeled hand data.

## Live inference state and direct controls

Current game state, checked against `AGENTS.md`: the left-half runner sends
`left`, `right`, or `jump` through `inputBus`; the right-half saboteur sends `aim`,
`select`, or `fire`. The title and game-over screens also listen for a runner jump
to start/restart. Vision does not own the runner’s world/lane state, attack deck,
or scene transitions. A **SENT** label acknowledges the actual input event, not
whether the world could act on it (for example, left at the leftmost lane).

The game’s webcam canvases now include the tracked hand skeleton, a correct-half
hint when no hand is visible, the static pose when available, capture-to-result
age, and a short **SENT** control badge. The lab also has large control cards;
its event log remains the full history. Badges expire and landmarks older than
250 ms are hidden so a frozen inference cannot masquerade as live tracking.

Preview rendering runs independently of inference. Each worker accepts only the
latest available camera frame when idle, with no queue. Runner results dispatch
immediately without waiting for the saboteur. Runner swipes use raw normalized
palm positions; aiming retains smoothing and hysteresis. Clear swipes still need
three samples, at least 24 ms, configured travel and a dominant axis. The existing
cooldown prevents duplicate controls; this does not change game movement balance.

Inference reads separate raw canvases, never the annotated preview. Results older
than 180 ms are delivered as a missing hand, resetting motion/dwell rather than
replaying stale commands. Individual worker failures show an error in that half
and leave the other player running. Live latency stats use runner cadence and
runner capture-to-control time; this is not a measured physical gesture latency.
Recorded frames are sorted by capture timestamp on export because the independent
workers can finish out of order.

Actual webcam accuracy and physical movement-to-screen latency still need testing
with the players. Synthetic trace tests verify direct bus dispatch at 70 ms for a
clear 22%-width swipe and verify that an unresolved saboteur does not delay it.

### Live verification of feedback (2026-10-24)

The running local production-path lab reported both trackers on worker/GPU,
approximately 29 processed fps and runner capture-to-control p50/p95 of 24/30 ms.
The live log contained `source: vision` jump and right events while hand tracking
was active. This verifies live model → interpreter → input-bus feedback, not a
physical movement-to-screen latency measurement or a two-person distance test.
No webcam images or landmark recording were saved for this check.

## Facecam layout test branch

The game route (`/`) is the primary gameplay view. It groups both live camera
halves into a compact bottom-left facecam dock, above the runner’s instruction
line and away from the central lanes and right-side card deck. It defaults to
28% of stage width (up to 360 px), with a larger 34% option and a collapse button.
Collapsing hides the video panel only; vision input keeps running. The Lab link
opens detailed diagnostics separately. The full halves keep their aspect ratios
so hands are not cropped out to manufacture a landscape feed. Overlay text is
limited to thin header/footer strips, leaving faces and gestures visible.

For a camera-free layout check, open `/?facecam-preview`. The game is real and
keyboard-playable; both clearly marked camera placeholders are static, with no
tracking or generated input. The normal `/` route uses the actual webcam. The
existing `/?novision` route remains keyboard-only with no facecam dock.

This presentation change also touches shell mounting, stage CSS and `index.html`;
it is intentionally a cross-lane PR for review. It must remain unmerged until the
team has tested and approved it, as requested by Anirudh.

## Saboteur controls (current)

The card poses above are no longer used; the game drops one random obstacle per cast.
Aim with an open palm; a fist fires. While the fist closes, the target is locked to the
lane held ~200 ms earlier (finger curl drags the palm landmark) and aiming resumes when
the hand opens. Vision only sends intentions (`aim`, `fire`); the game accepts or rejects
each cast and reports it through `cast-result` / `saboteur-status` (mirrored on
`saboteurBus`), which the camera overlay shows as Ready / Cast queued / Cooldown /
Rejected instead of only "SENT".

## Flexible directional input

Any instinctive cue works; they all produce the same events.

- Runner (`left` / `right` / `jump`): swipe the hand, **point** the index finger
  (left / right / up, held ~150 ms), or **lean** the hand into the left or right edge
  zone for ~300 ms. Lean only arms after the hand has rested in the middle, and a swipe
  or point disarms it, so the hand a swipe leaves at the edge never fires twice.
- Saboteur (`aim`): palm position still aims as before. A quick **swipe** left/right, or
  **pointing** left/right, also steps the target one lane. A camera-column crossing
  always updates the target, even after a swipe. A swipe within the same camera column
  steps the target and keeps it selected while the hand rests in that column. A swipe
  that already crosses a column does not add an extra step. Steps are ignored while
  a confirmed fist is locking the target.

## Swipe detection

Swipes are judged on speed as well as distance, over every recent start point, so slow
drift and resting jitter never fire and a swipe after a pause is caught mid-stroke. The
hand returning after a swipe is the main false positive. Within 900 ms, reversals
must meet the prior stroke's speed and an absolute 1.6 units/s floor. A confirmed
burst (a three-sample span under 50 ms or a corroborated large displacement) caps
that reference at 3 units/s, so an exceptional first flick cannot impose an
unrealistic speed on the next one. Ordinary-stroke return filtering is unchanged.
A new axis is independent of the prior direction's cooldown. A same-direction
repeat needs the normal 350 ms cooldown or a 70 ms rest within a 0.035-radius zone.
The rest clears old tail samples, preserving one command per continuous sweep.
`swipe-sim.ts` and its tests guard detection, latency, ghost returns and reversals.

## Fast-motion dropouts

A fast hand blurs and the tracker briefly reports "no hand". "No hand" frames within 140 ms
of the last real one are skipped (`DROPOUT_BRIDGE_MS` in `interpreter.ts`), so swipe
strokes, target locks and fist holds survive the blink; a longer loss still resets
everything. The camera overlay holds the last skeleton for the same time. The swipe
glitch guard treats >14 units/s as suspicious, not automatically impossible. It
keeps that candidate for one observation and accepts it only with further aligned
movement (at least max(0.025, 15% of the configured stroke distance), 0.9 path
straightness). A teleport followed by a static/noisy endpoint, or a one-frame
spike returning to its origin, is still rejected. Both MediaPipe models also run with 0.35 detection / presence /
tracking confidence (default 0.5) to keep a blurred hand instead of re-detecting it.

## Fast-swipe reliability investigation (2026-10-24)

The previous detector rejected three consistent observations spanning less than
50 ms, erased any step over 14 normalized units/s, and applied the horizontal
cooldown to a following jump. A very fast first stroke could also make the next
reversal's required speed impractical. These are deterministic software losses,
separate from model inference speed or camera blur.

Regression traces now cover a 32 ms/60-fps flick, a large corroborated motion,
dodge-then-jump, burst-then-reversal, repeated same-direction strokes separated by
a brief rest, and false tracking jumps. The five intended fast sequences fail on
the pre-fix detector and pass on this branch; noise/jump rejection remains intact.
On the existing 900 seeded ordinary-stroke simulations, before/after results are
identical: 100% intended detections, median 116.8 ms and p90 153.9 ms detection time,
and 0.189 extra return commands per trial. These are synthetic regression metrics,
not live-camera accuracy estimates. Return intent is inherently ambiguous from
positions alone; this work does not eliminate that limitation.

Inference now catches up immediately to the latest presented frame when a worker
becomes free. At 30 camera fps and a 35 ms model time, previously a frame at 33 ms
could be skipped and the worker then waited until 66 ms. The test now verifies it
starts that latest frame at 35 ms, with no frame queue or duplicate processing.
The lab also separates the camera driver's reported fps from processed fps.

Three real observations are still required. At 30 camera fps, a complete flick
and return that happens between frames cannot be reconstructed safely. The code
already requests 60 fps, but hardware/browser negotiation and low-light exposure
can still limit capture or blur the hand. Check the reported/processed fps and
record actual fast swipes in the lab to validate on the demo laptop. No change to
stage speed, obstacle timing, collisions, shared contracts or other lanes is part
of this fix. The pointing/lean alternatives remain available.

## Saboteur position/swipe arbitration fix

The old P2 path mixed absolute palm zones with a forced relative lane, a 300 ms-old
lane history and a sticky latch that required a 200 ms stop plus additional travel.
That could suppress camera-column changes or turn a fresh swipe into a no-op.
`gestures/saboteur-aim.ts` now keeps physical camera zone and selected target separate.
Physical zone changes always win; a within-zone swipe/point can step the target.
Motion direction/rest/acceleration separate strokes, preventing a cross-column
swipe from also jumping a second column. The P2 position quantizer has a 2.5%
hysteresis margin, and P2 alone uses a 120 ms swipe cooldown without reverse-return
suppression. P1 retains its exact current detector settings and behavior.

The saboteur-only target lock still protects a fist cast, but it releases on a
recognized non-fist pose or after 120 ms of uncertain pose observations. Brief
uncertainty remains tolerated. This prevents a single false fist from freezing aim
until the classifier eventually produces an explicit open-palm label. After release
or a long tracking loss, position aiming re-synchronizes with the camera zone.

Regression traces reproduce continuous column crossings after a relative swipe,
a fresh swipe following an earlier position change, false-fist recovery, rapid
within-column swipes, no double-step on a cross-column swipe, and stable relative
aim followed by reacquisition. The first three fail against the prior P2 path.
P1's interpreter branch and outer frame handling were compared byte-for-byte with
7136b2a; model/capture/scheduler/shared-detector files and runner game code are
unchanged. This branch is stacked on `ani/fast-swipe-reliability` so the fix does
not replace or revert the P1 fast-input version currently being tested.
