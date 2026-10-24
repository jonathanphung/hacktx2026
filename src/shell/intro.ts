import { playCue } from "./audio";
import type Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { addBeanstalks, mountShell } from "./presentation";

const STORY = [
  {
    speaker: "Jon",
    title: "A wizard at the roots",
    text: "Giant! Five enchanted tales are tangled in your beanstalk. I am climbing up to set them free.",
    scene: "grove",
  },
  {
    speaker: "Giant",
    title: "A challenge above the clouds",
    text: "Then find each tale’s treasure, little wizard! My stones and fire will send you tumbling home.",
    scene: "clouds",
  },
  {
    speaker: "Jon",
    title: "The climb begins",
    text: "One egg, one potion, one slipper, one trident, and one hood. Staff ready. Let the adventure begin!",
    scene: "grove",
  },
] as const;

/** A short illustrated sequence, rendered locally from the saved story beats. */
export function playIntro(scene: Phaser.Scene, onComplete: () => void): void {
  const screen = mountShell(scene, "story-screen intro-screen");
  screen.setAttribute("role", "dialog");
  screen.setAttribute("aria-modal", "true");
  screen.setAttribute("aria-label", "Opening story");
  addBeanstalks(screen);
  const content = document.createElement("div");
  content.className = "intro-content";
  content.innerHTML = `<p class="story-eyebrow">JON AND THE BEANSTALK · PROLOGUE</p>
    <div class="intro-illustration" aria-hidden="true">
      <svg viewBox="0 0 800 230"><g class="intro-stars" fill="#fff3ad"><path d="M110 40 l5 15 15 5 -15 5 -5 15 -5 -15 -15 -5 15 -5z M620 25 l4 12 12 4 -12 4 -4 12 -4 -12 -12 -4 12 -4z"/><circle cx="680" cy="95" r="4"/><circle cx="210" cy="35" r="3"/></g>
      <path class="intro-vine" d="M400 260 C490 170 335 100 410 -30" fill="none" stroke="#77a761" stroke-width="23"/>
      <path d="M420 130 Q500 90 510 140 Q460 180 420 130 M390 70 Q310 40 315 95 Q360 120 390 70" fill="#a6ca7b"/>
      <g class="intro-wizard" transform="translate(270 150)"><path d="M0 -35 l-34 80 68 0z" fill="#7550a0" stroke="#e6cb89" stroke-width="3"/><circle cy="-40" r="14" fill="#edc49e"/><ellipse cy="-49" rx="35" ry="8" fill="#493061"/><path d="M0 -100 l-25 50 50 0z" fill="#8059ad"/><path d="M35 40 l8 -86" stroke="#bd965e" stroke-width="7"/><path d="M43 -66 l-10 18 10 18 10 -18z" fill="#b8ffe5"/><circle cx="-5" cy="-70" r="5" fill="#fff3ad"/></g>
      <g class="intro-giant" transform="translate(600 110)"><path d="M-62 110 v-70 Q-55 0 0 0 Q55 0 62 40 v70z" fill="#624278" stroke="#d1ae72" stroke-width="4"/><path d="M-62 40 l-25 40 15 20 25 -40 M62 40 l25 40 -15 20 -25 -40" fill="#ae7f5c" stroke="#805539" stroke-width="4"/><ellipse cy="-36" rx="43" ry="42" fill="#bd926b" stroke="#805539" stroke-width="4"/><path d="M-38 -57 Q0 -95 38 -57 l-5 -20 -66 0z" fill="#47334e"/><path d="M-27 -43 l17 -5 M10 -48 l17 5" fill="none" stroke="#493342" stroke-width="5"/><circle cx="-16" cy="-36" r="4" fill="#2e2334"/><circle cx="16" cy="-36" r="4" fill="#2e2334"/><path d="M-4 -32 l-5 12 15 0 M-14 -10 Q0 3 14 -10" fill="none" stroke="#795038" stroke-width="4"/><path d="M-39 -15 Q0 45 39 -15 Q0 23 -39 -15" fill="#9d805f"/><path d="M-57 82 h114" stroke="#edcf89" stroke-width="10"/><circle cy="36" r="12" fill="#f1dc98"/><path d="M0 17 l5 14 14 5 -14 5 -5 14 -5 -14 -14 -5 14 -5z" fill="#fff3c8"/></g></svg>
    </div>
    <p class="intro-adventure"></p><p class="intro-speaker"></p><h1 class="intro-title"></h1><p class="intro-narration" role="status"></p>
    <div class="intro-dots" aria-label="Story progress"></div>
    <div class="intro-actions"><button class="story-button intro-next" type="button">Next</button><button class="intro-skip" type="button">Skip story</button></div>
    <p class="start-hint">Enter: next · Esc: skip · The story advances automatically</p>`;
  screen.append(content);
  content.querySelector(".intro-adventure")!.textContent = "Five Enchanted Tales";
  let index = 0,
    done = false;
  let timer: Phaser.Time.TimerEvent | undefined;
  const cleanup = () => {
    timer?.remove();
    window.removeEventListener("keydown", onKey, true);
  };
  const finish = () => {
    if (done) return;
    done = true;
    cleanup();
    screen.remove();
    onComplete();
  };
  const render = () => {
    timer?.remove();
    const beat = STORY[index];
    screen.dataset.theme = beat.scene;
    screen.dataset.speaker = beat.speaker;
    content.querySelector(".intro-speaker")!.textContent =
      beat.speaker === "Jon" ? "JON · YOUNG WIZARD" : "THE GIANT · GUARDIAN OF THE TALES";
    playCue(beat.speaker === "Jon" ? "jon" : "giant");
    content.querySelector(".intro-title")!.textContent = beat.title;
    content.querySelector(".intro-narration")!.textContent = `“${beat.text}”`;
    const dots = content.querySelector(".intro-dots")!;
    dots.replaceChildren();
    STORY.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.className = i === index ? "active" : "";
      dots.append(dot);
    });
    content.querySelector(".intro-next")!.textContent =
      index === 2 ? "Begin the first tale" : "Next";
    timer = scene.time.delayedCall(Math.max(3300, Math.min(5000, beat.text.length * 30)), advance);
  };
  const advance = () => {
    if (done) return;
    if (index === 2) finish();
    else {
      index++;
      render();
    }
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (event.code === "Escape" || event.code === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === "Escape") finish();
      else advance();
    }
  };
  content.querySelector(".intro-next")!.addEventListener("click", advance);
  content.querySelector(".intro-skip")!.addEventListener("click", finish);
  window.addEventListener("keydown", onKey, true);
  untilShutdown(scene, cleanup);
  render();
}
