import Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { inputBus } from "../shared/input";
import { onMenuMotion } from "./menu-motion";
import { installShellAudio, playCue } from "./audio";
import { playCinematic } from "./cinematic";
import { unlockCell } from "./rescue";
import { addBeanstalks, mountShell } from "./presentation";

import { letterMarkup, towerArt } from "./story";

let introSeen = false;

function installStart(
  scene: Phaser.Scene,
  button: HTMLButtonElement,
  target = "game",
  keyboardStart = true,
): void {
  let started = false;
  const go = () => {
    if (started || button.closest<HTMLElement>(".story-screen")?.inert) return;
    started = true;
    if (target === "tutorial") {
      scene.scene.start("tutorial");
      return;
    }
    button.disabled = true;
    button.textContent = "Opening the story…";
    {
      if (!scene.sys.isActive()) return;
      const begin = () => {
        introSeen = true;
        playCue("start");
        scene.scene.start("game");
      };
      if (introSeen) begin();
      else {
        const menu = button.closest<HTMLElement>(".story-screen");
        if (menu) menu.inert = true;
        playCinematic(scene, false, begin);
      }
    }
  };
  const onEnter = (event: KeyboardEvent) => {
    if (event.code !== "Enter" || event.repeat) return;
    event.preventDefault();
    if (keyboardStart) go();
  };
  if (keyboardStart) untilShutdown(scene, onMenuMotion(go));
  button.disabled = false;
  button.addEventListener("click", go);
  window.addEventListener("keydown", onEnter);
  untilShutdown(scene, () => window.removeEventListener("keydown", onEnter));
  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (keyboardStart && e.player === "runner" && e.action === "jump") go();
    }),
  );
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }
  create(data: { practiceComplete?: boolean } = {}) {
    installShellAudio();
    const screen = mountShell(this, "story-screen");
    addBeanstalks(screen);
    const content = document.createElement("div");
    content.className = "story-content";
    content.innerHTML = `<p class="story-eyebrow">AN ENCHANTED TALE FOR TWO</p>
      <h1>Jon and the Beanstalk</h1>
      <p class="story-subtitle">Claude is missing. Follow the clues. Bring your companion home.</p>
      <div class="role-cards">
        <section class="role-card"><span class="role-number">PLAYER ONE · LEFT SIDE</span><h2>Jon the Wizard</h2><p>Dodge the giant’s tricks.<br>Keep your adventure alive.</p><strong>Swipe left / right to dodge<br>Swipe up to jump</strong><small>A / D / W · Jump low traps; dodge walls</small></section>
        <section class="role-card giant"><span class="role-number">PLAYER TWO · RIGHT SIDE</span><h2>Be the Giant</h2><p>Guard your kingdom in the clouds.<br>Send obstacles into Jon’s path.</p><strong>Move your hand to aim<br>Close your fist to fire</strong><small>J / K / L: aim · Space: drop next · Stock grows every 2 tales</small></section>
      </div>
      <button class="story-button" type="button" data-primary>Learn to play · practice grove</button>
      <button class="story-secondary" type="button" data-secondary>Skip practice · Play story</button>
      <p class="start-hint">Click to begin, press Enter, or move either player’s hand · Esc pauses during play</p>
      <p class="camera-hint">Share one webcam. Keep one hand visible in your half.</p>`;
    screen.append(content);
    const primary = content.querySelector<HTMLButtonElement>("[data-primary]")!;
    const secondary = content.querySelector<HTMLButtonElement>("[data-secondary]")!;
    if (data.practiceComplete) {
      primary.textContent = "Enter the enchanted realm";
      secondary.textContent = "Practice again";
      installStart(this, primary);
      secondary.addEventListener("click", () => this.scene.start("tutorial"));
      this.time.delayedCall(0, () => primary.click());
    } else {
      installStart(this, primary, "tutorial");
      installStart(this, secondary, "game", false);
    }
  }
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("game-over");
  }
  create(result: {
    score: number;
    survivedMs: number;
    stage?: number;
    outcome?: "caught" | "escaped";
  }) {
    const victory = result.outcome === "escaped";
    const showResult = () => {
      installShellAudio();
      const screen = mountShell(this, "story-screen game-over-screen");
      addBeanstalks(screen);
      const content = document.createElement("div");
      content.className = "story-content";
      content.innerHTML = `<p class="story-eyebrow">THIS CHAPTER ENDS</p><h1>The Giant caught Jon!</h1>
      <p class="story-subtitle">Every good tale deserves another try.</p>
      <div class="story-results"><div><strong id="result-score"></strong><span>SCORE</span></div><div><strong id="result-time"></strong><span>SURVIVED</span></div></div>
      <button class="story-button" type="button" disabled>Catch your breath…</button>
      <p class="start-hint">Click replay, press Enter, or move either player’s hand for another adventure</p>`;

      if (victory) {
        screen.classList.add("festival-victory");
        content.querySelector(".story-eyebrow")!.textContent = "RESCUE COMPLETE";
        content.querySelector("h1")!.textContent = "Claude is free!";
        content.querySelector(".story-subtitle")!.textContent =
          "The lock is broken. Jon and Claude made it out.";
        const art = document.createElement("div");
        art.className = "victory-badge";
        art.innerHTML = towerArt(true);
        const spell = document.createElement("div");
        spell.className = "spell-word victory-spell";
        spell.innerHTML = letterMarkup(6);
        content.prepend(art, spell);
        playCue("victory");
        for (let i = 0; i < 24; i++) {
          const spark = document.createElement("i");
          spark.className = "festival-confetti";
          spark.style.setProperty("--i", String(i));
          screen.append(spark);
        }
      }
      content.querySelector("#result-score")!.textContent = String(result.score);
      content.querySelector("#result-time")!.textContent =
        `${(result.survivedMs / 1000).toFixed(1)}s`;
      screen.append(content);
      const button = content.querySelector("button")!;
      this.time.delayedCall(800, () => {
        button.textContent = victory ? "Begin a new story" : "Play again";
        installStart(this, button);
      });
    };
    if (victory) unlockCell(this, () => playCinematic(this, true, showResult));
    else showResult();
  }
}
