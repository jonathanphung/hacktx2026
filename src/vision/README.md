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
Only one frame per tracker can be in flight; the next shared camera frame waits
until both results arrive. Stop/abort terminates workers and rejects pending work.
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
- `gestures/swipe.ts`: 250 ms window, 0.2-half-frame minimum travel, 350 ms cooldown,
  1.5:1 axis dominance and 0.8 path efficiency. Three samples and 60 ms minimum.
- `gestures/smoothing.ts`: 30 ms time-based palm filter; resets after tracking loss.
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
