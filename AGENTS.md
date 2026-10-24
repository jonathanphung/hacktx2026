# AGENTS.md — rules for every coding agent in this repo

Four humans each drive their own agent (Claude Code, Codex/GPT, etc.) and push at
the same time. These rules exist so nobody's agent breaks anybody else's work.
Read this whole file before your first change in a session.

## 0. The project

A two-player, webcam-controlled 2D endless runner in the browser. Both players stand
in front of **one laptop and one webcam**; the camera image is split down the middle.

- **Player 1 (runner, left half)** swipes one hand left / right / up to change lanes and jump.
- **Player 2 (saboteur, right half)** gets a random attack card every few seconds, aims
  at a lane with hand position, and fires with a fist.

Stack: TypeScript (strict) + Vite + **Phaser 3.90** + **MediaPipe tasks-vision** running
in the browser. No backend. Deployed as a static site to GitHub Pages.

## 1. Know your lane

Each person owns one area. Work inside your owner's lane. If you must touch
another lane, keep the change minimal and say so in the PR title (`[cross-lane]`).

| Lane                    | Owner             | Directories                                                                                     | Label      |
| ----------------------- | ----------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| A. Vision (gestures)    | _TBD_             | `src/vision/`, `vision.html`, `public/models/`                                                  | `vision`   |
| B. Runner (P1) + world  | _TBD_             | `src/game/runner/`, `src/game/GameScene.ts`                                                     | `runner`   |
| C. Saboteur (P2)        | _TBD_             | `src/game/saboteur/`                                                                            | `saboteur` |
| D. Shell & presentation | _TBD_             | `src/shell/`, `src/style.css`, `index.html`, `public/assets/`, `scripts/`, `.github/`, `README` | `shell`    |
| **Shared contracts**    | everyone (see §3) | `src/shared/`                                                                                   | `contract` |

Team: @jonathanphung, @aariv-modi, @AnirudhSekar, @PPilot2 — put one handle per lane.

What each lane owns:

- **A. Vision** — camera, cropping each player's half, the two MediaPipe trackers,
  turning hand motion into `InputEvent`s (swipe, aim, fist), calibration, the debug
  page. Detectors in `src/vision/gestures/` are pure functions with unit tests.
- **B. Runner** — the scrolling three-lane world, runner movement/jump, collisions,
  powerups, speed ramp, score, game over. Implements the `World` API other lanes use.
  Owns `GameScene.ts`, which stays tiny: each lane plugs in with one `install…` call.
- **C. Saboteur** — the attack deck, aiming, firing, every attack/trap type. One file
  per attack in `src/game/saboteur/attacks/`, spawned through `World.spawnObstacle`.
- **D. Shell** — title / calibration / game-over scenes, HUD, webcam corners, art,
  animation, audio, deployment, end-to-end playtesting, the demo.

## 2. Git workflow — always

1. Start from fresh main: `git fetch origin && git switch -c <you>/<topic> origin/main`
   - `<you>` = owner's first name, e.g. `jon/jump-animation`. One branch per task.
2. Keep branches **small and short-lived** (aim: merged within ~1 hour).
   Small PRs are what keep four parallel agents conflict-free.
3. Before pushing: `git fetch origin && git rebase origin/main`, then run
   `./scripts/check.sh`. Fix anything it reports. Do not push red.
4. Push and open a PR: `gh pr create --fill` (or via the GitHub UI). Then enable
   auto-merge: `gh pr merge --auto --squash`. It merges itself once CI is green.
5. After merge, start the next task from fresh `origin/main` — never keep
   building on a merged branch.

Never:

- push to `main` directly, force-push to `main`, or force-push someone else's branch
- rewrite history that's already in `main`
- commit secrets (`.env`, API keys). Use `.env.example` with placeholder values.
- run `git add -A` blindly — check `git status` first so you don't commit
  generated junk or another agent's half-finished files

If a person runs more than one agent at once, give each its own
`git worktree add ../hacktx2026-<topic> -b <you>/<topic> origin/main` so they
don't share a working tree.

## 3. Shared contracts (`src/shared/`)

Lanes talk to each other **only** through these types. That's what lets four
people build in parallel: build against the contract, not against each other's code.

| File         | Contract                                                                  |
| ------------ | ------------------------------------------------------------------------- |
| `input.ts`   | `InputEvent` + `inputBus`. Vision and keyboard emit; game code listens.   |
| `world.ts`   | `World` (runner implements, saboteur calls), `ObstacleSpec`, `GameEvents` |
| `attacks.ts` | `AttackDef` — one saboteur card                                           |
| `vision.ts`  | `HandFrame`, `VisionHandle` — what vision exposes to the shell            |
| `types.ts`   | `Lane`, `PlayerId`, `PLAYER_SIDE`, playfield size                         |
| `emitter.ts` | typed event emitter + `untilShutdown` helper                              |

- Changing a contract = its own small PR, prefixed `[contract]`, merged before
  the code that depends on it. `tsc` in CI will catch any lane it breaks.
- Prefer **additive** changes (new optional fields, new union members). Don't
  rename or remove things other lanes use without the owner's OK.
- Lane-specific tuning lives in that lane's own `config.ts`, not in `shared/`.

## 4. Conflict hot-spots

- **`package-lock.json`**: on conflict, don't hand-merge. Take main's version and
  re-run `npm install`.
- **`package.json`**: adding a dependency is fine (`--save-exact`); don't bump or
  remove others' deps without asking. **Do not upgrade Phaser to v4** (see §6).
- **Registries** (`src/game/saboteur/attacks/index.ts`, scene lists in `main.ts`):
  add your line, don't reorder existing lines.
- **Formatting**: Prettier is enforced in CI. Run `npm run format` on files you
  changed; don't reformat files you didn't touch.

If you hit a merge conflict in another lane's code, stop and tell your human
rather than guessing.

## 5. Tasks

Tasks live in GitHub Issues, labeled by lane. Before starting, assign yourself
(`gh issue edit <n> --add-assignee @me`) so no two agents do the same thing.
Put `Closes #<n>` in the PR body.

## 6. Technical gotchas — read before writing code

- **Phaser 3.90, not 4.** Write Phaser 3 code. Don't use Phaser 4 APIs and don't
  upgrade the package — v4 changed effects, masks, tint and shaders.
- **Listeners must not leak across restarts.** `inputBus` lives for the whole session.
  In a scene, always wrap subscriptions: `untilShutdown(scene, inputBus.on(...))`.
  The same goes for `scene.events.on("update", ...)`.
- **One game clock.** Use the `time` argument of the scene `update` event for all game
  timing (cooldowns, durations). `scene.time.now` is stale inside `create()` after a
  restart, and mixing the two clocks caused real bugs here already.
- **Coordinates from vision are mirrored, per-half, normalized 0..1** — they match
  what the player sees in their corner. Never use raw camera coordinates.
- **Webcam needs HTTPS or `localhost`.** `npm run dev` is fine; so is GitHub Pages.
- **Gesture input lags ~200–300 ms behind a keyboard.** Game balance must allow for it
  (more warning before obstacles), so test with gestures, not just keys.
- **Models are self-hosted** in `public/models/` and MediaPipe's WASM is copied to
  `public/mediapipe/wasm` by `npm install`. Don't switch to CDN URLs (venue Wi-Fi).
- **Asset paths**: prefix with `import.meta.env.BASE_URL` (the site lives under
  `/hacktx2026/` on GitHub Pages).

## 7. Commands

| What                 | Command                                                |
| -------------------- | ------------------------------------------------------ |
| Install              | `npm install`                                          |
| Dev server           | `npm run dev` → http://localhost:5173                  |
| Game without camera  | http://localhost:5173/?novision                        |
| Vision debug page    | http://localhost:5173/vision.html                      |
| Everything CI checks | `./scripts/check.sh` (format, typecheck, tests, build) |
| Auto-format          | `npm run format`                                       |
| Unit tests           | `npm test`                                             |

Keyboard controls (same events as gestures): runner **A / D / W**; saboteur aim
**J / K / L**, fire **Space**, pick card **1–3**; **Enter** starts a run.
