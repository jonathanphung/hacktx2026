import Phaser from "phaser";
import { type Emitter, untilShutdown } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import { GAME_HEIGHT, GAME_WIDTH, LANES, type Lane } from "../../shared/types";
import type {
  GameEvents,
  ObstacleSpec,
  ObstacleView,
  PowerupKind,
  World,
} from "../../shared/world";
import { POWERUPS, RUNNER } from "./config";
import { POWERUP_DURATION, POWERUP_KINDS, PowerupState } from "./powerups";
import { speedAt } from "./speed";
import { createTrack } from "./track";
import { createPickupView, RunnerView } from "./view";

interface Obstacle {
  spec: ObstacleSpec;
  view: ObstacleView;
  w: number;
  h: number;
  /** Already touched the runner: effects apply once per obstacle. */
  touched: boolean;
}

interface Pickup {
  kind: PowerupKind;
  view: ObstacleView;
}

const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

/** Builds the scrolling three-lane world and the player-1 runner. Returns the World API. */
export function installRunner(scene: Phaser.Scene, events: Emitter<GameEvents>): World {
  const laneX = (lane: Lane) => GAME_WIDTH / 2 + (lane - 1) * RUNNER.laneSpacing;

  const track = createTrack(scene, laneX);

  let lane: Lane = 1;
  const runner = new RunnerView(scene, laneX(lane), RUNNER.runnerY);
  const hitbox = RUNNER.hitboxSize;

  // All timing uses the `time` passed to update (one clock). Set on the first frame, because
  // scene.time.now is stale inside create() after a restart.
  let now = -1;
  let startedAt = -1;
  let airborneUntil = 0;
  let slowUntil = 0;
  let points = 0;
  let speed = RUNNER.baseSpeed;
  let over = false;
  let nextPowerupAt = -1;
  const obstacles: Obstacle[] = [];
  const pickups: Pickup[] = [];
  const powerups = new PowerupState();
  const score = () => Math.floor(points);

  const startPowerup = (kind: PowerupKind, time: number) => {
    powerups.activate(kind, time);
    if (kind === "shield") runner.setShield(true);
    events.emit("powerup", { kind, active: true, durationMs: POWERUP_DURATION[kind] });
  };
  const endPowerup = (kind: PowerupKind) => {
    if (kind === "shield") runner.setShield(false);
    events.emit("powerup", { kind, active: false, durationMs: 0 });
  };

  const moveTo = (next: Lane) => {
    runner.moveTo(laneX(next), next < lane ? -1 : 1);
    lane = next;
  };

  const jump = () => {
    if (now < 0 || now < airborneUntil) return;
    airborneUntil = now + RUNNER.jumpMs;
    runner.jump(RUNNER.jumpMs);
  };

  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (over || e.player !== "runner") return;
      if (e.action === "left" && lane > 0) moveTo((lane - 1) as Lane);
      if (e.action === "right" && lane < 2) moveTo((lane + 1) as Lane);
      if (e.action === "jump") jump();
    }),
  );

  const update = (time: number, delta: number) => {
    if (over) return;
    now = time;
    if (startedAt < 0) {
      startedAt = time;
      nextPowerupAt = time + POWERUPS.everyMs;
    }
    const dt = delta / 1000;
    const elapsed = (time - startedAt) / 1000;
    powerups.expire(time).forEach(endPowerup);
    speed =
      speedAt(elapsed) * (time < slowUntil ? RUNNER.slowFactor : 1) * powerups.speedFactor(time);
    const airborne = time < airborneUntil;

    if (time >= nextPowerupAt) {
      nextPowerupAt = time + POWERUPS.everyMs;
      const kind = pick(POWERUP_KINDS);
      const view = createPickupView(scene, laneX(pick(LANES)), -POWERUPS.size, kind);
      pickups.push({ kind, view });
    }
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.view.y += speed * dt;
      const touched =
        Math.abs(p.view.x - runner.x) < (POWERUPS.size + hitbox) / 2 &&
        Math.abs(p.view.y - RUNNER.runnerY) < (POWERUPS.size + hitbox) / 2;
      if (touched) startPowerup(p.kind, time);
      if (touched || p.view.y > GAME_HEIGHT + POWERUPS.size) {
        p.view.destroy();
        pickups.splice(i, 1);
      }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      ob.view.y += speed * dt;
      const hit =
        !ob.touched &&
        Math.abs(ob.view.x - runner.x) < (ob.w + hitbox) / 2 &&
        Math.abs(ob.view.y - RUNNER.runnerY) < (ob.h + hitbox) / 2 &&
        !(ob.spec.jumpable && airborne);
      if (hit) {
        ob.touched = true;
        events.emit("runner-hit", { kind: ob.spec.kind, effect: ob.spec.effect });
        if (powerups.absorbHit(time)) {
          endPowerup("shield");
          runner.shieldBlocked();
        } else if (ob.spec.effect === "end-run") {
          over = true;
          runner.crash();
          events.emit("game-over", {
            score: score(),
            survivedMs: time - startedAt,
          });
          return;
        } else if (ob.spec.effect === "slow") {
          slowUntil = time + RUNNER.slowMs;
          runner.slowed();
        }
      }
      // Solid obstacles break on contact; surfaces (slow) stay and scroll away.
      const smashed = hit && ob.spec.effect === "end-run";
      if (smashed || ob.view.y > GAME_HEIGHT + ob.h) {
        ob.view.destroy();
        obstacles.splice(i, 1);
      }
    }

    track.scroll(speed * dt);
    runner.setSpeed(speed);
    points += (speed * dt * powerups.scoreFactor(time)) / 10;
    events.emit("score", { score: score() });
  };
  scene.events.on("update", update);
  untilShutdown(scene, () => scene.events.off("update", update));

  return {
    scene,
    events,
    laneX,
    get speed() {
      return speed;
    },
    spawnObstacle(spec) {
      const w = spec.width ?? RUNNER.laneSpacing - 30;
      const h = spec.height ?? 40;
      const x = laneX(spec.lane);
      const y = -h;
      const view =
        spec.createView?.(scene, x, y) ?? scene.add.rectangle(x, y, w, h, spec.color ?? 0xffffff);
      // Surfaces under solid obstacles, both above the lane markings (depth 1).
      (view as { setDepth?: (depth: number) => unknown }).setDepth?.(
        spec.effect === "slow" ? 2 : 3,
      );
      obstacles.push({ spec, view, w, h, touched: false });
    },
  };
}
