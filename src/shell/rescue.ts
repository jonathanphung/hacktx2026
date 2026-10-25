import type Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { playCue } from "./audio";
import { mountShell } from "./presentation";
import { acceptsMessage, letterMarkup, towerArt } from "./story";

/** Reaching the tower is not victory: the collected message must open the cell. */
export function unlockCell(scene: Phaser.Scene, onUnlocked: () => void): void {
  const screen = mountShell(scene, "tale-cutscene rescue-lock");
  screen.setAttribute("role", "dialog");
  screen.setAttribute("aria-modal", "true");
  screen.setAttribute("aria-label", "Claude's tower cell");
  screen.innerHTML = `<div class="tale-frame"><div class="tale-art">${towerArt()}</div><div class="tale-copy"><p class="tale-kicker">THE TOP OF THE TOWER</p><h1>Claude is on the other side.</h1><p class="tale-dialogue">Xen’s badge reveals the final letter: X. Six clues, in the order you found them. Speak their message to break the lock.</p><div class="spell-word" aria-label="Your collected clues">${letterMarkup(6)}</div><form class="rescue-form"><label for="cell-message">Enter the hidden message</label><div><input id="cell-message" name="message" type="text" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="cell-feedback" required/><button class="story-button" type="submit">Unlock the cell</button></div><p id="cell-feedback" role="status" aria-live="polite">Claude: “Jon? Is that you?”</p></form></div></div>`;
  const form = screen.querySelector<HTMLFormElement>("form")!;
  const input = screen.querySelector<HTMLInputElement>("input")!;
  const button = screen.querySelector<HTMLButtonElement>("button")!;
  const feedback = screen.querySelector<HTMLElement>("#cell-feedback")!;
  let unlocked = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (unlocked) return;
    if (!acceptsMessage(input.value)) {
      input.setAttribute("aria-invalid", "true");
      feedback.textContent =
        "The lock flickers, but holds. Read your six clues from left to right and try again.";
      playCue("blocked");
      input.focus();
      input.select();
      return;
    }
    unlocked = true;
    input.removeAttribute("aria-invalid");
    input.disabled = button.disabled = true;
    screen.classList.add("rescue-unlocked");
    screen.querySelector(".tale-art")!.innerHTML = towerArt(true);
    feedback.textContent = "The message shines. The bars rise. Claude is free!";
    playCue("victory");
    timer = setTimeout(() => {
      window.removeEventListener("keydown", onKey, true);
      screen.remove();
      onUnlocked();
    }, 1800);
  });
  const onKey = (event: KeyboardEvent) => {
    if (event.code === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (event.code === "Tab") {
      event.preventDefault();
      (document.activeElement === input ? button : input).focus();
    }
  };
  window.addEventListener("keydown", onKey, true);
  untilShutdown(scene, () => {
    clearTimeout(timer);
    window.removeEventListener("keydown", onKey, true);
  });
  input.focus();
}
