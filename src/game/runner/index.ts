import Phaser from "phaser";
import { type Emitter, untilShutdown } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import { GAME_HEIGHT, GAME_WIDTH, type Lane } from "../../shared/types";
import type { GameEvents, ObstacleSpec, ObstacleView, World } from "../../shared/world";
import { RUNNER } from "./config";
import { createTrack } from "./track";
import { RunnerView } from "./view";

interface Obstacle {
  spec: ObstacleSpec;
  view: ObstacleView;
  w: number;
  h: number;
}

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
  let distance = 0;
  let speed = RUNNER.baseSpeed;
  let over = false;
  const obstacles: Obstacle[] = [];

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
    if (startedAt < 0) startedAt = time;
    const dt = delta / 1000;
    const elapsed = (time - startedAt) / 1000;
    speed =
      (RUNNER.baseSpeed + elapsed * RUNNER.accel) * (time < slowUntil ? RUNNER.slowFactor : 1);
    const airborne = time < airborneUntil;

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      ob.view.y += speed * dt;
      const hit =
        Math.abs(ob.view.x - runner.x) < (ob.w + hitbox) / 2 &&
        Math.abs(ob.view.y - RUNNER.runnerY) < (ob.h + hitbox) / 2 &&
        !(ob.spec.jumpable && airborne);
      if (hit) {
        events.emit("runner-hit", { kind: ob.spec.kind, effect: ob.spec.effect });
        if (ob.spec.effect === "end-run") {
          over = true;
          runner.crash();
          events.emit("game-over", {
            score: Math.floor(distance / 10),
            survivedMs: time - startedAt,
          });
          return;
        }
        if (ob.spec.effect === "slow") {
          slowUntil = time + RUNNER.slowMs;
          runner.slowed();
        }
      }
      if (hit || ob.view.y > GAME_HEIGHT + ob.h) {
        ob.view.destroy();
        obstacles.splice(i, 1);
      }
    }

    track.scroll(speed * dt);
    runner.setSpeed(speed);
    distance += speed * dt;
    events.emit("score", { score: Math.floor(distance / 10) });
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
      obstacles.push({ spec, view, w, h });
    },
  };
}
