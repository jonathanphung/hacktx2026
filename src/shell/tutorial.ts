import Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { inputBus } from "../shared/input";
import type { Lane } from "../shared/types";
import { RUNNER } from "../game/runner/config";
import { Spring } from "../game/runner/motion";
import { createTrack } from "../game/runner/track";
import { createPickupView, preloadRunnerAssets, RunnerView } from "../game/runner/view";
import { createObstacleView } from "../game/saboteur/obstacle-view";
import { withObstacleCue } from "../game/runner/obstacle-cue";
import { createGiantHand } from "../game/saboteur/giant-hand";
import { onMenuMotion } from "./menu-motion";
import { mountShell } from "./presentation";
import { installPause } from "./pause";
import { POWERUP_GUIDE } from "./game-guide";

const LESSONS = [
  [
    "JON · DODGE",
    "Swipe left, then right",
    "Move between stems. Your hand is the controller.",
    "A / D also work",
  ],
  [
    "JON · JUMP",
    "Jump the low log",
    "Stay on its stem. Swipe up as the log reaches you. Missing is safe; try again.",
    "W also works · ↑ means jumpable",
  ],
  [
    "JON · READ THE PATH",
    "Dodge the tall wall",
    "Move to another stem before it reaches you. Jumping will not clear a wall.",
    "A / D · ↔ means dodge only",
  ],
  [
    "JON · POWER-UPS",
    "Collect the shield",
    "Move onto the glowing pickup’s stem. Shields block one hit; hourglasses slow time; ½ slows the points drain.",
    "Pickups have bright halos and names",
  ],
  [
    "GIANT · AIM",
    "Aim left, then right",
    "Move your open hand across the columns in the right camera. Swipes can switch columns too.",
    "J / L also work",
  ],
  [
    "GIANT · CAST",
    "Close your fist to drop",
    "Aim at any stem, then make a fist. The hand winds up before the obstacle drops.",
    "Space also works",
  ],
  [
    "GIANT · PLAN AHEAD",
    "Drop the next object in rotation",
    "Barrier → Hurdle → Oil → Mud → Fireball, then repeat. Your next drop is a Hurdle. Aim, then close your fist again.",
    "Open your palm between fists · Space also works",
  ],
  [
    "BOTH PLAYERS · READY",
    "Your story starts here",
    "Jon reads the path. The Giant sets the trap. Keep one hand visible in your half of the camera.",
    "Move either hand / Enter to begin · Click also works",
  ],
] as const;

/** Separate safe practice scene. Reads the existing input bus; changes no vision or P1 input code. */
export class TutorialScene extends Phaser.Scene {
  constructor() {
    super("tutorial");
  }
  preload() {
    preloadRunnerAssets(this);
  }
  create() {
    installPause(this);
    const laneX = (lane: Lane) => 640 + (lane - 1) * RUNNER.laneSpacing;
    const track = createTrack(this, laneX);
    let lane: Lane = 1,
      aim: Lane = 1,
      now = -1,
      airborneUntil = 0,
      lesson = 0;
    let waiting = false,
      nextSpawn = 0;
    let lessonTarget: Lane = lane;
    const moves = new Set<string>();
    const aims = new Set<Lane>();
    const lateral = new Spring(laneX(lane), laneX(lane), RUNNER.laneOmega);
    const runner = new RunnerView(this, laneX(lane), RUNNER.runnerY);
    const marker = this.add.triangle(laneX(aim), 100, 0, 0, 32, 0, 16, 24, 0xff7777).setDepth(12);
    const glow = this.add
      .rectangle(laneX(aim), 360, 152, 720, 0xff5252, 0.12)
      .setDepth(7)
      .setVisible(false);
    let object: {
      view: Phaser.GameObjects.Container;
      lane: Lane;
      type: "log" | "wall" | "shield";
    } | null = null;
    let hand: ReturnType<typeof createGiantHand> | null = null;
    const ui = mountShell(this, "practice-ui");
    ui.innerHTML = `<header><span>PRACTICE GROVE · NO LIVES LOST</span><strong></strong><progress max="7" value="0" aria-label="Tutorial progress"></progress></header>
      <section class="practice-card"><small></small><h1></h1><p></p><kbd></kbd><div class="practice-feedback" role="status" aria-live="polite"></div><button class="practice-action" type="button" hidden></button></section>
      <aside class="practice-guide"><h2>READ THE MAGIC</h2><p class="jump-key">↑ JUMP · low logs, thorns, oil, sap</p><p class="dodge-key">↔ DODGE · walls, rocks, mud, fireballs</p>${Object.values(
        POWERUP_GUIDE,
      )
        .map((p) => `<p><b>${p.symbol} ${p.name}</b><br>${p.effect}</p>`)
        .join("")}</aside>
      <button class="practice-skip" type="button">Skip practice → story</button>`;
    const feedback = ui.querySelector<HTMLElement>(".practice-feedback")!;
    const action = ui.querySelector<HTMLButtonElement>(".practice-action")!;
    let stopFinishMotion: (() => void) | undefined;
    const show = () => {
      lessonTarget = lesson === 3 ? (lane === 0 ? 2 : 0) : lane;
      const [who, title, description, keys] = LESSONS[lesson];
      ui.querySelector("header strong")!.textContent = `LESSON ${Math.min(lesson + 1, 7)} / 7`;
      ui.querySelector("progress")!.value = lesson;
      ui.querySelector("section small")!.textContent = who;
      ui.querySelector("h1")!.textContent = title;
      ui.querySelector("section p")!.textContent = description;
      ui.querySelector("kbd")!.textContent = keys;
      feedback.textContent = "";
      action.hidden = lesson < 7;
      action.textContent = "Enter the story →";
      if (lesson === 7 && !stopFinishMotion) stopFinishMotion = onMenuMotion(finish);
      glow.setVisible(lesson >= 4 && lesson < 7);
      marker.setVisible(lesson >= 4 && lesson < 7);
    };
    const finish = () => {
      if (this.sys.isPaused()) return;
      stopFinishMotion?.();
      ui.inert = true;
      this.scene.start("title", { practiceComplete: true });
    };
    ui.querySelector(".practice-skip")!.addEventListener("click", finish);
    const complete = (message: string) => {
      if (waiting) return;
      waiting = true;
      feedback.textContent = message;
      this.time.delayedCall(1000, () => {
        object?.view.destroy();
        object = null;
        hand?.destroy();
        hand = null;
        lesson++;
        waiting = false;
        nextSpawn = now + 500;
        show();
      });
    };
    const beginKey = (event: KeyboardEvent) => {
      if (lesson === 7 && event.code === "Enter" && !event.repeat) finish();
    };
    window.addEventListener("keydown", beginKey);
    untilShutdown(this, () => {
      window.removeEventListener("keydown", beginKey);
      stopFinishMotion?.();
    });
    action.addEventListener("click", () => {
      if (!this.sys.isPaused() && lesson === 7) finish();
    });
    untilShutdown(
      this,
      inputBus.on("input", (e) => {
        if (this.sys.isPaused() || now < 0) return;
        if (e.player === "runner") {
          if (e.action === "left" && lane > 0) {
            lane = (lane - 1) as Lane;
            moves.add("left");
          }
          if (e.action === "right" && lane < 2) {
            lane = (lane + 1) as Lane;
            moves.add("right");
          }
          if (e.action === "jump" && now >= airborneUntil) airborneUntil = now + RUNNER.jumpMs;
          lateral.target = laneX(lane);
          if (lesson === 0 && moves.has("left") && moves.has("right"))
            complete("Both directions! Now try a jump.");
        } else {
          if (e.action === "aim") {
            aim = e.lane;
            if (lesson === 4) aims.add(aim);
          }
          if (lesson === 4 && aims.has(0) && aims.has(2))
            complete("The red marker follows your aim.");
          if (e.action === "fire" && (lesson === 5 || lesson === 6) && !waiting) {
            const kind = lesson === 5 ? "barrier" : "hurdle";
            const jumpable = kind === "hurdle";
            const height = jumpable ? 24 : 50;
            hand = createGiantHand(this, laneX(aim), 0xffb74d, 400, kind);
            waiting = true;
            this.time.delayedCall(400, () => {
              hand?.release();
              hand = null;
              const view = withObstacleCue(
                this,
                createObstacleView(this, laneX(aim), 110, kind, 140, height),
                { kind, lane: aim, jumpable, effect: "end-run", height },
              );
              this.tweens.add({
                targets: view,
                y: 420,
                duration: 700,
                onComplete: () => {
                  view.destroy();
                  waiting = false;
                  complete(
                    lesson === 5
                      ? "Barrier dropped. Next in rotation: Hurdle."
                      : "Hurdle dropped. Oil is next; the preview lets you plan.",
                  );
                },
              });
            });
          }
        }
      }),
    );
    const spawn = () => {
      const type = lesson === 1 ? "log" : lesson === 2 ? "wall" : "shield";
      const target = lessonTarget;
      let view: Phaser.GameObjects.Container;
      if (type === "shield") view = createPickupView(this, laneX(target), 140, "shield");
      else {
        const jumpable = type === "log";
        view = withObstacleCue(
          this,
          createObstacleView(
            this,
            laneX(target),
            140,
            jumpable ? "hurdle" : "barrier",
            140,
            jumpable ? 24 : 50,
          ),
          { kind: type, lane: target, jumpable, effect: "end-run", height: jumpable ? 24 : 50 },
        );
      }
      object = { view, lane: target, type };
    };
    const update = (time: number, delta: number) => {
      now = time;
      const dt = Math.min(delta, 60) / 1000;
      track.update(dt, 150);
      lateral.step(dt);
      runner.render(
        {
          x: lateral.value,
          vx: lateral.velocity,
          jump: time < airborneUntil ? 1 - (airborneUntil - time) / RUNNER.jumpMs : null,
          slowed: false,
          speed: 150,
        },
        time,
        dt,
      );
      marker.x = laneX(aim);
      glow.x = laneX(aim);
      if (waiting || lesson < 1 || lesson > 3) return;
      if (!object && time >= nextSpawn) spawn();
      if (!object) return;
      object.view.y += 170 * dt;
      if (lesson === 1)
        feedback.textContent =
          object.view.y > RUNNER.runnerY - 80 ? "↑ JUMP NOW" : "Wait for the log to approach…";
      if (object.view.y < RUNNER.runnerY) return;
      const same = Math.abs(lateral.value - laneX(object.lane)) < (140 + RUNNER.hitboxSize) / 2;
      const ok =
        object.type === "log"
          ? same && time < airborneUntil
          : object.type === "wall"
            ? !same
            : Math.abs(lateral.value - laneX(object.lane)) < 46;
      if (ok) {
        if (object.type === "shield") runner.setShield(true);
        complete(
          object.type === "log"
            ? "Cleared! Green arrows mean jumpable."
            : object.type === "wall"
              ? "Dodged! Walls require a lane change."
              : "Shield collected. One hit protected!",
        );
      } else {
        feedback.textContent =
          object.type === "log"
            ? "Try again: stay on the log’s stem and jump near the end."
            : object.type === "wall"
              ? "Walls need a dodge. Try a lane change."
              : "Missed it? Another shield is on its way.";
        nextSpawn = time + 1600;
        lessonTarget = lesson === 3 ? (lane === 0 ? 2 : 0) : lane;
      }
      object.view.destroy();
      object = null;
    };
    this.events.on("update", update);
    untilShutdown(this, () => {
      this.events.off("update", update);
      hand?.destroy();
    });
    show();
  }
}
