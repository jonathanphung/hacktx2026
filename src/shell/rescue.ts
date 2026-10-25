import type Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { playCue } from "./audio";
import { mountShell } from "./presentation";
import { letterMarkup, towerArt } from "./story";
import { onStoryFrame } from "./menu-motion";
import { StoryPalmHold } from "./story-controls";

/** The six earned clues form the spell; holding either palm casts it without typing. */
export function unlockCell(scene: Phaser.Scene, onUnlocked: () => void): void {
  const screen = mountShell(scene, "tale-cutscene rescue-lock pixel-rescue");
  screen.setAttribute("role", "dialog");
  screen.setAttribute("aria-modal", "true");
  screen.setAttribute("aria-label", "Claude's tower cell");
  screen.innerHTML = `<div class="tale-frame"><div class="tale-art">${towerArt()}</div><div class="tale-copy"><p class="tale-kicker">SIX CLUES · ONE PROMISE</p><h1>Bring Claude home.</h1><p class="tale-dialogue">Your treasures spell the message that opens this cell. Hold an open palm toward the camera to cast it.</p><div class="spell-word" aria-label="Your collected clues">${letterMarkup(6)}</div><div class="rescue-cast"><progress max="1" value="0" aria-label="Open palm spell charge"></progress><p class="rescue-feedback" role="status" aria-live="polite">Either player · Open hand · Hold for one second</p><button class="story-button" type="button">Cast the collected spell</button><small>No camera? Click to cast. No typing needed.</small></div></div></div>`;
  const button = screen.querySelector<HTMLButtonElement>("button")!;
  const feedback = screen.querySelector<HTMLElement>(".rescue-feedback")!;
  const progress = screen.querySelector<HTMLProgressElement>("progress")!;
  const hold = new StoryPalmHold();
  let unlocked = false,
    disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let offFrames = () => {};
  const cleanup = () => {
    disposed = true;
    offFrames();
    window.removeEventListener("keydown", onKey, true);
    clearTimeout(timer);
  };
  const cast = () => {
    if (unlocked || disposed) return;
    unlocked = true;
    offFrames();
    button.disabled = true;
    progress.value = 1;
    screen.classList.add("rescue-unlocked");
    screen.querySelector(".tale-art")!.innerHTML = towerArt(true);
    feedback.textContent = "The spell takes hold. Claude is free!";
    playCue("victory");
    timer = setTimeout(() => {
      cleanup();
      screen.remove();
      onUnlocked();
    }, 1600);
  };
  const armAt = performance.now() + 900;
  offFrames = onStoryFrame((frame) => {
    if (unlocked || disposed || performance.now() < armAt) return;
    const result = hold.push(frame);
    progress.value = result.progress;
    screen.querySelectorAll<HTMLElement>(".spell-letter").forEach((letter, i) => {
      letter.classList.toggle("spell-charging", result.progress >= (i + 1) / 6);
    });
    // Announce state changes rather than every inference frame.
    const text =
      result.progress > 0
        ? "Keep your palm open…"
        : "Either player · Open hand · Hold for one second";
    if (feedback.textContent !== text) feedback.textContent = text;
    if (result.complete) cast();
  });
  const onKey = (event: KeyboardEvent) => {
    if (event.code === "Tab") {
      event.preventDefault();
      button.focus();
    }
    if (event.code === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  window.addEventListener("keydown", onKey, true);
  button.addEventListener("click", cast);
  button.focus();
  untilShutdown(scene, cleanup);
}
