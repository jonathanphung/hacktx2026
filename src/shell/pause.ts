import { onStoryAdvance } from "./story-controls";
import { playCue, pauseMusic } from "./audio";
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
  let storyActive = false;
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
  description.textContent = "Wave either hand to resume, or use the Resume button.";
  const resume = document.createElement("button");
  resume.type = "button";
  resume.textContent = "Resume · Esc";
  resume.setAttribute("aria-live", "polite");
  const home = document.createElement("button");
  home.type = "button";
  home.className = "story-secondary";
  home.textContent = "Home screen";
  panel.append(heading, description, resume, home);
  overlay.append(panel);
  stage.append(trigger, overlay);

  // All game lanes receive the same adjusted update clock. Phaser timers and tweens
  // already stop with the scene; raw update timestamps otherwise include the pause.
  const emit = scene.events.emit;
  scene.events.emit = function (event: string | symbol, ...args: unknown[]) {
    if (event === "update" && typeof args[0] === "number") args[0] = clock.time(args[0]);
    return emit.call(this, event, ...args);
  };
  let countdown: ReturnType<typeof setTimeout> | undefined;
  let counting = false;
  let stopResumeMotion = () => {};
  const resetCountdown = () => {
    clearTimeout(countdown);
    counting = false;
    resume.disabled = false;
    resume.textContent = "Resume · Esc";
    heading.textContent = "A moment among the clouds";
    description.textContent = "Wave either hand to resume, or use the Resume button.";
  };
  const beginResume = () => {
    stopResumeMotion();
    counting = true;
    resume.disabled = true;
    let seconds = 3;
    heading.textContent = "Wands ready. Giant ready.";
    description.textContent = "Get into position · Esc cancels the countdown";
    const tick = () => {
      if (ended || storyActive) {
        resetCountdown();
        return;
      }
      if (seconds === 0) {
        resetCountdown();
        paused = false;
        overlay.hidden = true;
        trigger.hidden = false;
        clock.resume(scene.game.loop.time);
        scene.scene.resume();
        pauseMusic(false);
        playCue("resume");
        trigger.focus();
        return;
      }
      resume.textContent = String(seconds--);
      playCue("ready");
      countdown = setTimeout(tick, 1000);
    };
    tick();
  };
  const toggle = () => {
    if (ended || storyActive) return;
    if (counting) {
      resetCountdown();
      stopResumeMotion = onStoryAdvance(() => {
        if (paused && !counting) beginResume();
      });
      return;
    }
    if (paused) {
      beginResume();
      return;
    }
    paused = true;
    stopResumeMotion = onStoryAdvance(() => {
      if (paused && !counting) beginResume();
    });
    pauseMusic(true);
    playCue("pause");
    overlay.hidden = false;
    trigger.hidden = true;
    clock.pause(scene.game.loop.time);
    scene.scene.pause();
    resume.focus();
  };
  const onKey = (event: KeyboardEvent) => {
    if (storyActive) return;
    if (event.code === "Escape" && !event.repeat) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggle();
    } else if (paused && event.code === "Tab") {
      event.preventDefault();
      if (resume.disabled || document.activeElement === resume) home.focus();
      else resume.focus();
    }
  };
  trigger.addEventListener("click", toggle);
  resume.addEventListener("click", toggle);
  home.addEventListener("click", () => {
    ended = true;
    stopResumeMotion();
    resetCountdown();
    pauseMusic(false);
    scene.scene.resume();
    scene.scene.start("title");
  });
  window.addEventListener("keydown", onKey, true);
  const storyPause = (active: boolean) => {
    storyActive = active;
    trigger.hidden = active;
    pauseMusic(active);
    if (active) {
      stopResumeMotion();
      clock.pause(scene.game.loop.time);
      scene.scene.pause();
    } else {
      clock.resume(scene.game.loop.time);
      scene.scene.resume();
    }
  };
  scene.events.on("shell-story-pause", storyPause);
  untilShutdown(scene, () => {
    stopResumeMotion();
    resetCountdown();
    scene.events.off("shell-story-pause", storyPause);
    scene.events.emit = emit;
    window.removeEventListener("keydown", onKey, true);
    trigger.remove();
    overlay.remove();
  });
  // Prevent pausing the short transition after a fatal collision.
  scene.events.once("shell-run-ended", () => {
    stopResumeMotion();
    resetCountdown();
    ended = true;
    trigger.disabled = true;
  });
}
