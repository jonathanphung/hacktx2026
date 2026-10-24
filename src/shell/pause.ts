import type Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";

/** Converts the game's clock into play time, excluding time spent paused. */
export class PlayClock {
  private pausedAt: number | undefined;
  private excluded = 0;
  pause(time: number): void {
    this.pausedAt ??= time;
  }
  resume(time: number): void {
    if (this.pausedAt === undefined) return;
    this.excluded += time - this.pausedAt;
    this.pausedAt = undefined;
  }
  time(time: number): number {
    return (this.pausedAt ?? time) - this.excluded;
  }
}

/** DOM controls remain interactive while the Phaser scene is paused. */
export function installPause(scene: Phaser.Scene): void {
  const stage = document.getElementById("stage");
  if (!stage) return;
  const clock = new PlayClock();
  let paused = false;
  let ended = false;
  const trigger = document.createElement("button");
  trigger.id = "pause-toggle";
  trigger.type = "button";
  trigger.textContent = "Pause · Esc";
  const overlay = document.createElement("div");
  overlay.id = "pause-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "pause-title");
  const panel = document.createElement("div");
  panel.className = "pause-panel";
  const heading = document.createElement("h2");
  heading.id = "pause-title";
  heading.textContent = "A moment among the clouds";
  const description = document.createElement("p");
  description.textContent = "Game paused. Jon and the giant can catch their breath.";
  const resume = document.createElement("button");
  resume.type = "button";
  resume.textContent = "Resume · Esc";
  panel.append(heading, description, resume);
  overlay.append(panel);
  stage.append(trigger, overlay);

  // All game lanes receive the same adjusted update clock. Phaser timers and tweens
  // already stop with the scene; raw update timestamps otherwise include the pause.
  const emit = scene.events.emit;
  scene.events.emit = function (event: string | symbol, ...args: unknown[]) {
    if (event === "update" && typeof args[0] === "number") args[0] = clock.time(args[0]);
    return emit.call(this, event, ...args);
  };
  const toggle = () => {
    if (ended) return;
    paused = !paused;
    overlay.hidden = !paused;
    trigger.hidden = paused;
    if (paused) {
      clock.pause(scene.game.loop.time);
      scene.scene.pause();
      resume.focus();
    } else {
      clock.resume(scene.game.loop.time);
      scene.scene.resume();
      trigger.focus();
    }
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.code === "Escape" && !event.repeat) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggle();
    } else if (paused && event.code === "Tab") {
      event.preventDefault();
      resume.focus();
    }
  };
  trigger.addEventListener("click", toggle);
  resume.addEventListener("click", toggle);
  window.addEventListener("keydown", onKey, true);
  untilShutdown(scene, () => {
    scene.events.emit = emit;
    window.removeEventListener("keydown", onKey, true);
    trigger.remove();
    overlay.remove();
  });
  // Prevent pausing the short transition after a fatal collision.
  scene.events.once("shell-run-ended", () => {
    ended = true;
    trigger.disabled = true;
  });
}
