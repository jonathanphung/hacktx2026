import type Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { playCue } from "./audio";
import { mountShell } from "./presentation";
import { letterMarkup, PROLOGUE, REWARDS, taleArt, type StoryBeat } from "./story";

/** Browser timers keep the dialogue interactive while the game scene is frozen. */
export function playStory(
  scene: Phaser.Scene,
  beats: readonly StoryBeat[],
  onComplete: () => void,
): void {
  const screen = mountShell(scene, "tale-cutscene");
  screen.setAttribute("role", "dialog");
  screen.setAttribute("aria-modal", "true");
  screen.setAttribute("aria-label", "Story cutscene");
  screen.innerHTML = `<div class="tale-frame"><div class="tale-art"></div><div class="tale-copy"><p class="tale-kicker">THE SEARCH FOR CLAUDE</p><div class="spell-word" aria-label="Restored letters"></div><p class="tale-speaker"></p><h1></h1><p class="tale-dialogue" aria-live="polite"></p><p class="tale-reward"></p><div class="tale-controls"><button class="story-button tale-next" type="button">Next</button><button class="tale-skip" type="button">Skip scene</button><small>Enter: next · Esc: skip</small></div></div></div>`;
  const next = screen.querySelector<HTMLButtonElement>(".tale-next")!;
  const skip = screen.querySelector<HTMLButtonElement>(".tale-skip")!;
  const previousFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let index = 0,
    done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    clearTimeout(timer);
    window.removeEventListener("keydown", onKey, true);
  };
  const finish = () => {
    if (done) return;
    done = true;
    cleanup();
    screen.remove();
    if (previousFocus?.isConnected) previousFocus.focus();
    onComplete();
  };
  const render = () => {
    clearTimeout(timer);
    const beat = beats[index];
    screen.querySelector(".tale-art")!.innerHTML = taleArt(beat.art);
    screen.querySelector(".spell-word")!.innerHTML = letterMarkup(beat.collected);
    screen.querySelector(".tale-speaker")!.textContent = beat.speaker;
    screen.querySelector("h1")!.textContent = beat.title;
    screen.querySelector(".tale-dialogue")!.textContent = `“${beat.text}”`;
    const reward = beat.collected > 0 ? REWARDS[beat.collected - 1] : null;
    screen.querySelector(".tale-reward")!.textContent = reward
      ? `${reward[0]} unlocked · ${reward[1]}`
      : "Five tales · one missing companion · a hidden message";
    next.textContent =
      index === beats.length - 1
        ? beat.collected === 6
          ? "Together again"
          : "Continue the adventure"
        : "Next";
    playCue(beat.speaker === "THE GIANT" ? "giant" : "jon");
    timer = setTimeout(advance, Math.max(7000, beat.text.length * 50));
  };
  const advance = () => {
    if (index + 1 === beats.length) finish();
    else {
      index++;
      render();
    }
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (["Escape", "Enter", "Space", "Tab"].includes(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === "Escape") finish();
      else if (event.code === "Tab") (document.activeElement === next ? skip : next).focus();
      else if (document.activeElement === skip) finish();
      else advance();
    }
  };
  next.addEventListener("click", advance);
  skip.addEventListener("click", finish);
  window.addEventListener("keydown", onKey, true);
  untilShutdown(scene, () => {
    done = true;
    cleanup();
  });
  render();
  next.focus();
}
export const playIntro = (scene: Phaser.Scene, done: () => void) =>
  playStory(scene, PROLOGUE, done);
