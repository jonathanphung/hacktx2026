import Phaser from "phaser";
import { getMatch, setMatch, type MatchMode, type Difficulty } from "../shared/match";
import { untilShutdown } from "../shared/emitter";
import { inputBus } from "../shared/input";
import { onMenuMotion } from "./menu-motion";
import { installShellAudio, playCue } from "./audio";
import { playCinematic } from "./cinematic";
import { unlockCell } from "./rescue";
import { addBeanstalks, mountShell } from "./presentation";

import { letterMarkup } from "./story";

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
    if (event.target instanceof HTMLElement && event.target.closest("select, input")) return;
    if (event.target instanceof HTMLButtonElement && event.target !== button) return;
    if (event.code !== "Enter" || event.repeat) return;
    event.preventDefault();
    if (keyboardStart) go();
  };
  if (keyboardStart)
    untilShutdown(
      scene,
      onMenuMotion(() => {
        if (!(
          document.activeElement instanceof HTMLElement &&
          document.activeElement.closest(".mode-controls")
        ))
          go();
      }),
    );
  button.disabled = false;
  button.addEventListener("click", go);
  window.addEventListener("keydown", onEnter);
  untilShutdown(scene, () => window.removeEventListener("keydown", onEnter));
  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement.closest(".mode-controls")
      )
        return;
      if (keyboardStart && e.player === "runner" && e.action === "jump") go();
    }),
  );
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }
  create(data: { practiceComplete?: boolean; skipStoryPreview?: boolean } = {}) {
    installShellAudio();
    const screen = mountShell(this, "story-screen");
    addBeanstalks(screen);
    const content = document.createElement("div");
    content.className = "story-content";
    content.innerHTML = `<p class="story-eyebrow">AN ENCHANTED TALE FOR TWO</p>
      <h1>Jon and the Beanstalk</h1>
      <p class="story-subtitle">Claude is missing. Follow the clues. Bring your companion home.</p>
      <div class="mode-controls"><label>Play mode<select aria-label="Play mode"><option value="duo">Two players</option><option value="jon">Play as Jon · AI Giant</option><option value="giant">Play as Giant · AI Jon</option></select></label><label class="difficulty-control">Opponent<select aria-label="AI difficulty"><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label></div><p class="mode-hint"></p><div class="role-cards">
        <section class="role-card"><span class="role-number">PLAYER ONE · LEFT SIDE</span><h2>Jon the Wizard</h2><p>Dodge the giant’s tricks.<br>Keep your adventure alive.</p><strong>Swipe left / right to dodge<br>Swipe up to jump</strong><small>A / D / W · Jump low traps; dodge walls</small></section>
        <section class="role-card giant"><span class="role-number">PLAYER TWO · RIGHT SIDE</span><h2>Be the Giant</h2><p>Guard your kingdom in the clouds.<br>Send obstacles into Jon’s path.</p><strong>Move your hand to aim<br>Close your fist to fire</strong><small>J / K / L: aim · Space: drop next · Stock grows every 2 tales</small></section>
      </div>
      <button class="story-button" type="button" data-primary>Start adventure</button>
      <button class="story-secondary" type="button" data-secondary>Practice controls</button>
      <p class="start-hint">Click to begin, press Enter, or move either player’s hand · Esc pauses during play</p>
      <p class="camera-hint">Share one webcam. Keep one hand visible in your half.</p>`;
    screen.append(content);
    if (import.meta.env.DEV && new URLSearchParams(location.search).has("combat-preview")) {
      this.time.delayedCall(0, () => this.scene.start("game"));
      return;
    }
    const mode = content.querySelector<HTMLSelectElement>('[aria-label="Play mode"]')!;
    const difficulty = content.querySelector<HTMLSelectElement>('[aria-label="AI difficulty"]')!;
    mode.value = getMatch().mode;
    difficulty.value = getMatch().difficulty;
    const updateMode = () => {
      setMatch(mode.value as MatchMode, difficulty.value as Difficulty);
      content.querySelector<HTMLElement>(".difficulty-control")!.hidden = mode.value === "duo";
      content.querySelector(".mode-hint")!.textContent =
        mode.value === "duo"
          ? "Share one camera, or use A/D/W and J/K/L + Space."
          : mode.value === "jon"
            ? "You control Jon on the left. The AI giant guards the climb."
            : "You control the giant on the right. Stop AI Jon before he reaches Claude.";
      content.querySelector<HTMLElement>(".role-cards")!.hidden = true;
      content.querySelector(".camera-hint")!.textContent =
        mode.value === "duo"
          ? "One camera, two players. Keyboard controls also work."
          : mode.value === "jon"
            ? "Your controls: left half of the camera, or A / D / W."
            : "Your controls: right half of the camera, or J / K / L + Space.";
      content.querySelector(".start-hint")!.textContent =
        "Enter or click to begin · Esc pauses during play";
      content.querySelector(".story-eyebrow")!.textContent =
        mode.value === "duo" ? "AN ENCHANTED TALE FOR TWO" : "ONE PLAYER · ONE RESCUE";
    };
    mode.addEventListener("change", updateMode);
    difficulty.addEventListener("change", updateMode);
    updateMode();
    // Local review routes avoid completing all six stages just to inspect the ending.
    const preview = new URLSearchParams(location.search).get("story-preview");
    if (
      import.meta.env.DEV &&
      !data.skipStoryPreview &&
      ["opening", "ending", "rescue", "victory"].includes(preview ?? "")
    ) {
      content.inert = true;
      const done = () => this.scene.start("title", { skipStoryPreview: true });
      this.time.delayedCall(0, () => {
        if (preview === "victory")
          this.scene.start("game-over", {
            score: 2000,
            survivedMs: 120000,
            stage: 5,
            outcome: "escaped",
          });
        else if (preview === "rescue") unlockCell(this, () => playCinematic(this, true, done));
        else playCinematic(this, preview === "ending", done);
      });
      return;
    }
    const primary = content.querySelector<HTMLButtonElement>("[data-primary]")!;
    const secondary = content.querySelector<HTMLButtonElement>("[data-secondary]")!;
    if (data.practiceComplete) {
      primary.textContent = "Enter the enchanted realm";
      secondary.textContent = "Practice again";
      installStart(this, primary);
      secondary.addEventListener("click", () => this.scene.start("tutorial"));
      this.time.delayedCall(0, () => primary.click());
    } else {
      installStart(this, primary, "game");
      secondary.addEventListener("click", () => this.scene.start("tutorial"));
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
    const giantPlayer = getMatch().mode === "giant";
    const victory = giantPlayer ? result.outcome !== "escaped" : result.outcome === "escaped";
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

      if (victory && !giantPlayer) {
        screen.classList.add("festival-victory");
        content.querySelector(".story-eyebrow")!.textContent = "RESCUE COMPLETE";
        content.querySelector("h1")!.textContent = "Claude is free!";
        content.querySelector(".story-subtitle")!.textContent =
          "The lock is broken. Jon and Claude made it out.";
        const art = document.createElement("div");
        art.className = "victory-badge";
        art.innerHTML = `<img class="victory-claude" src="${import.meta.env.BASE_URL}assets/story/claude.png" alt="Claude, rescued and home" />`;
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
      if (giantPlayer) {
        content.querySelector(".story-results div:first-child span")!.textContent = "JON'S SCORE";
        content.querySelector(".story-results div:last-child span")!.textContent = victory
          ? "TIME TO CATCH"
          : "TIME";
        content.querySelector("h1")!.textContent = victory
          ? "You stopped Jon."
          : "Jon reached the tower.";
        content.querySelector(".story-subtitle")!.textContent = victory
          ? "The giant holds the beanstalk. Ready for another round?"
          : "AI Jon recovered the message. Try a different tactic next time.";
      }
      const changeMode = document.createElement("button");
      changeMode.type = "button";
      changeMode.className = "story-secondary";
      changeMode.textContent = "Change mode";
      changeMode.addEventListener("click", () => this.scene.start("title"));
      content.append(changeMode);
      content.querySelector("#result-score")!.textContent = String(result.score);
      content.querySelector("#result-time")!.textContent =
        `${(result.survivedMs / 1000).toFixed(1)}s`;
      screen.append(content);
      const button = content.querySelector("button")!;
      // Let players lower their hands after a fatal collision before gesture replay arms.
      const cameraDeath =
        result.outcome !== "escaped" &&
        !new URLSearchParams(location.search).has("novision") &&
        !document.getElementById("facecam")?.hidden;
      const replayDelay = cameraDeath ? 2000 : 800;
      if (cameraDeath) {
        let seconds = 2;
        button.textContent = `Catch your breath · ${seconds}s`;
        const hint = content.querySelector(".start-hint")!;
        hint.textContent = "Lower your hands. Replay unlocks in a moment.";
        this.time.addEvent({
          delay: 1000,
          repeat: 0,
          callback: () => {
            button.textContent = `Catch your breath · ${--seconds}s`;
          },
        });
      }
      this.time.delayedCall(replayDelay, () => {
        button.textContent = victory ? "Begin a new story" : "Play again";
        content.querySelector(".start-hint")!.textContent =
          "Click replay, press Enter, or move either player’s hand for another adventure";
        installStart(this, button);
      });
    };
    const previewVictory =
      import.meta.env.DEV &&
      new URLSearchParams(location.search).get("story-preview") === "victory";
    if (victory && !giantPlayer && !previewVictory)
      unlockCell(this, () => playCinematic(this, true, showResult));
    else showResult();
  }
}
