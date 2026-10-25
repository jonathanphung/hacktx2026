import Phaser from "phaser";
import { TalePots } from "./score";
import { acceptsPlayerInput } from "../../shared/match";
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
import { Snare } from "./snare";
import { withObstacleCue } from "./obstacle-cue";
import { POWERUPS, RUNNER } from "./config";
import { POWERUP_DURATION, POWERUP_KINDS, PowerupState } from "./powerups";
import { Spring } from "./motion";
import { RelicPowers } from "./relics";
import { absorbProtection } from "./protection";
import { hasEscapeLane } from "./spawn-safety";
import { finishFireballs } from "./projectiles";
import { TrailSpawner, trailHazard, naturalLanes } from "./trail";
import { isLastStage, type StageInfo } from "../../shared/stages";
import { pickItemLane } from "./items";
import {
  STAGE_BLEND_MS,
  STAGE_CALM_MS,
  STAGE_ITEM,
  STAGE_TUNING,
  stageHazardInterval,
  stageSpeed,
  StageRun,
} from "./stage-tuning";
import { createTrack } from "./track";
import { createPickupView, createStageItemView, RunnerView } from "./view";

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

/** The current stage's key item while it's on the track. */
interface StageItem {
  stage: StageInfo;
  lane: Lane;
  view: ObstacleView;
}

const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

/** Builds the scrolling three-lane world and the player-1 runner. Returns the World API. */
export function installRunner(scene: Phaser.Scene, events: Emitter<GameEvents>): World {
  const laneX = (lane: Lane) => GAME_WIDTH / 2 + (lane - 1) * RUNNER.laneSpacing;

  const track = createTrack(scene, laneX);

  let lane: Lane = 1;
  const runner = new RunnerView(scene, laneX(lane), RUNNER.runnerY);
  // Sideways position is gameplay (collisions use it), so it lives here, not in the view.
  const lateral = new Spring(laneX(lane), laneX(lane), RUNNER.laneOmega);
  const hitbox = RUNNER.hitboxSize;

  // All timing uses the `time` passed to update (one clock). Set on the first frame, because
  // scene.time.now is stale inside create() after a restart.
  let now = -1;
  let startedAt = -1;
  let airborneUntil = 0;
  const snare = new Snare();
  const pots = new TalePots();
  let speed = RUNNER.baseSpeed;
  let over = false;
  let nextPowerupAt = -1;
  const obstacles: Obstacle[] = [];
  const trail = new TrailSpawner();
  const stages = new StageRun();
  const relics = new RelicPowers();
  let safeUntil = 0;
  const jumpMs = () => RUNNER.jumpMs * relics.jumpFactor;
  let stageItem: StageItem | null = null;
  const laneOf = (x: number) => Math.round((x - laneX(1)) / RUNNER.laneSpacing + 1) as Lane;
  const waiting: ObstacleSpec[] = [];
  const spawnObstacle = (spec: ObstacleSpec) => {
    if (
      !hasEscapeLane(
        spec,
        obstacles.map((o) => ({
          lane: laneOf(o.view.x),
          y: o.view.y,
          jumpable: o.spec.jumpable,
          lethal: o.spec.effect === "end-run",
        })),
      )
    ) {
      waiting.push(spec);
      return;
    }
    const w = spec.width ?? RUNNER.laneSpacing - 30;
    const h = spec.height ?? 40;
    const x = laneX(spec.lane),
      y = -h;
    const view =
      spec.createView?.(scene, x, y) ?? scene.add.rectangle(x, y, w, h, spec.color ?? 0xffffff);
    const labelled = withObstacleCue(scene, view, spec).setDepth(spec.effect === "slow" ? 2 : 3);
    obstacles.push({ spec, view: labelled, w, h, touched: false });
    events.emit("obstacle-spawned", { kind: spec.kind, lane: spec.lane });
  };
  const pickups: Pickup[] = [];

  const enterStage = (stage: StageInfo, time: number, first = false) => {
    runner.setStage(stage.id);
    if (!first) {
      for (const obstacle of obstacles) obstacle.view.destroy();
      obstacles.length = 0;
      waiting.length = 0;
      events.emit("stage-changed", { index: stage.index, id: stage.id, name: stage.name });
      trail.holdUntil(time + STAGE_CALM_MS);
    }
    track.setStage(STAGE_TUNING[stage.id], first ? 1 : STAGE_BLEND_MS);
    track.announce(stage.name);
  };

  /** Puts the stage item in a lane where it can be reached, or retries shortly if none is clear. */
  const spawnStageItem = (time: number) => {
    const target = pickItemLane(obstacles.map((o) => ({ lane: laneOf(o.view.x), y: o.view.y })));
    if (target === null) return stages.spawnBlocked(time);
    const stage = stages.stage;
    const view = createStageItemView(
      scene,
      laneX(target),
      -STAGE_ITEM.size,
      stage.item.id,
      stage.item.name,
    );
    stageItem = { stage, lane: target, view };
    trail.holdUntil(time + STAGE_ITEM.hazardHoldMs);
    events.emit("stage-item", {
      state: "spawned",
      stage: stage.index,
      item: stage.item.id,
      lane: target,
    });
  };

  const resolveStageItem = (time: number, collected: boolean) => {
    const item = stageItem!;
    stageItem = null;
    item.view.destroy();
    events.emit("stage-item", {
      state: collected ? "collected" : "missed",
      stage: item.stage.index,
      item: item.stage.item.id,
      lane: item.lane,
    });
    if (collected) {
      relics.collect(time);
      runner.celebrate(speed);
      pots.bank(isLastStage(item.stage.index) ? STAGE_ITEM.finalBonus : 0);
    }
    const next = stages.itemGone(time, collected);
    if (stages.complete) {
      over = true;
      events.emit("game-over", {
        score: score(),
        survivedMs: time - startedAt,
        stage: stages.index,
        outcome: "escaped",
      });
      return;
    }
    if (next) enterStage(next, time);
  };
  const powerups = new PowerupState();
  const score = () => pots.score;

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
    if (!snare.allowDodge(now)) return;
    events.emit("runner-action", { action: next < lane ? "left" : "right" });
    lane = next;
    lateral.target = laneX(lane);
  };

  let jumpQueued = false;
  const jump = () => {
    if (now < 0) return;
    if (now < airborneUntil) {
      // Still in the air: remember a jump sent just before landing (gestures arrive late-ish).
      if (airborneUntil - now <= RUNNER.jumpBufferMs) jumpQueued = true;
      return;
    }
    airborneUntil = now + jumpMs();
    events.emit("runner-action", { action: "jump" });
  };

  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (scene.sys?.isPaused()) return;
      if (over || e.player !== "runner") return;
      if (!acceptsPlayerInput(e.player, e.source)) return;
      if (e.action === "left" && lane > 0) moveTo((lane - 1) as Lane);
      if (e.action === "right" && lane < 2) moveTo((lane + 1) as Lane);
      if (e.action === "jump") jump();
    }),
  );

  const update = (time: number, delta: number) => {
    if (over) {
      finishFireballs(obstacles, delta, speed);
      return;
    }
    now = time;
    const queued = waiting.splice(0);
    queued.forEach(spawnObstacle);
    if (startedAt < 0) {
      startedAt = time;
      enterStage(stages.stage, time, true);
      nextPowerupAt = time + POWERUPS.everyMs;
    }
    const dt = delta / 1000;
    powerups.expire(time).forEach(endPowerup);
    runner.setShield(powerups.isActive("shield", time) || relics.wardReady(time));
    const inStage = stages.secInStage(time);
    speed = stageSpeed(stages.stage.id, inStage) * powerups.speedFactor(time);
    if (jumpQueued && time >= airborneUntil) {
      jumpQueued = false;
      jump();
    }
    const airborne = time < airborneUntil;
    lateral.step(dt, RUNNER.laneOmega * snare.movementFactor(time));
    runner.render(
      {
        x: lateral.value,
        vx: lateral.velocity,
        jump: airborne ? 1 - (airborneUntil - time) / jumpMs() : null,
        slowed: snare.active(time),
        speed,
      },
      time,
      dt,
    );
    if (stages.itemDue(time)) spawnStageItem(time);
    if (stageItem) {
      stageItem.view.y += speed * dt;
      const reach = (STAGE_ITEM.size + hitbox) / 2 + relics.reach;
      // Collected on any overlap, jumping or not, so it's never harder to grab than to dodge.
      if (
        Math.abs(stageItem.view.x - lateral.value) < reach &&
        Math.abs(stageItem.view.y - RUNNER.runnerY) < reach
      )
        resolveStageItem(time, true);
      else if (stageItem.view.y > GAME_HEIGHT + STAGE_ITEM.size) resolveStageItem(time, false);
      // A collected key can open a cutscene synchronously. Do not process another collision.
      if (over || scene.sys.isPaused()) return;
    }

    if (
      trail.due(
        time,
        obstacles.some((ob) => ob.view.y < 260),
        stageHazardInterval(stages.stage.id, inStage),
      )
    ) {
      const tuning = STAGE_TUNING[stages.stage.id];
      const count = Math.random() < tuning.doubleChance ? 2 : 1;
      for (const target of naturalLanes(count))
        spawnObstacle(trailHazard(target, Math.random(), tuning.mix));
    }

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
        Math.abs(p.view.x - lateral.value) < (POWERUPS.size + hitbox) / 2 + relics.reach &&
        Math.abs(p.view.y - RUNNER.runnerY) < (POWERUPS.size + hitbox) / 2 + relics.reach;
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
        Math.abs(ob.view.x - lateral.value) < (ob.w + hitbox) / 2 &&
        Math.abs(ob.view.y - RUNNER.runnerY) < (ob.h + hitbox) / 2 &&
        !(ob.spec.jumpable && airborne);
      if (hit) {
        ob.touched = true;
        events.emit("runner-hit", {
          kind: ob.spec.kind,
          effect: ob.spec.effect,
          blocked: time < safeUntil || powerups.isActive("shield", time) || relics.wardReady(time),
          shieldBroken:
            time >= safeUntil && (powerups.isActive("shield", time) || relics.wardReady(time)),
        });
        if (time < safeUntil) {
          // A blocked hit cannot immediately chain into another fatal collision.
        } else if (powerups.isActive("shield", time) || relics.wardReady(time)) {
          const source = absorbProtection(powerups, relics, time);
          if (source === "pickup") endPowerup("shield");
          runner.shieldBlocked();
          safeUntil = time + RUNNER.blockGraceMs;
        } else if (ob.spec.effect === "end-run") {
          over = true;
          runner.crash();
          events.emit("game-over", {
            score: score(),
            survivedMs: time - startedAt,
            stage: stages.index,
          });
          return;
        } else if (ob.spec.effect === "slow") {
          const durationMs = RUNNER.slowMs * relics.slowFactor;
          snare.apply(time, durationMs);
          lateral.velocity *= RUNNER.slowFactor;
          events.emit("runner-slowed", { durationMs });
        }
      }
      // Solid obstacles break on contact; surfaces (slow) stay and scroll away.
      const smashed = hit && ob.spec.effect === "end-run" && ob.spec.kind !== "fireball";
      if (smashed || ob.view.y > GAME_HEIGHT + ob.h) {
        ob.view.destroy();
        obstacles.splice(i, 1);
      }
    }

    track.update(dt, speed);
    // Bonuses that used to multiply points now slow the drain instead.
    pots.drain(delta, powerups.scoreFactor(time) * relics.scoreFactor);
    events.emit("score", { score: score(), pot: Math.floor(pots.pot) });
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
    spawnObstacle,
    snapshot: () => ({
      runner: { lane, x: lateral.value, y: RUNNER.runnerY, airborne: now < airborneUntil },
      speed,
      stage: stages.index,
      obstacles: obstacles.map((o) => ({
        lane: laneOf(o.view.x),
        y: o.view.y,
        height: o.h,
        jumpable: o.spec.jumpable,
        lethal: o.spec.effect === "end-run",
      })),
      treasures: [
        ...pickups.map((p) => ({ lane: laneOf(p.view.x), y: p.view.y })),
        ...(stageItem ? [{ lane: stageItem.lane, y: stageItem.view.y }] : []),
      ],
    }),
  };
}
