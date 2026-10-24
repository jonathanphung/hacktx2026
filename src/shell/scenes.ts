import Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { inputBus } from "../shared/input";
import { installShellAudio, playCue } from "./audio";
import { getCampaign, setGameplayMode } from "../shared/campaign";
import { loadCampaign } from "./campaign";
import { playIntro } from "./intro";
import { addBeanstalks, mountShell } from "./presentation";

let introSeen = false;

function installStart(scene: Phaser.Scene, button: HTMLButtonElement): void {
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    button.disabled = true;
    button.textContent = "Opening the story…";
    void loadCampaign().then((campaign) => {
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
        playIntro(scene, campaign, begin);
      }
    });
  };
  const onEnter = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLSelectElement) return;
    if (event.code !== "Enter" || event.repeat) return;
    event.preventDefault();
    go();
  };
  button.disabled = false;
  button.addEventListener("click", go);
  window.addEventListener("keydown", onEnter);
  untilShutdown(scene, () => window.removeEventListener("keydown", onEnter));
  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (e.player === "runner" && e.action === "jump") go();
    }),
  );
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }
  create() {
    installShellAudio();
    void loadCampaign();
    const screen = mountShell(this, "story-screen");
    addBeanstalks(screen);
    const content = document.createElement("div");
    content.className = "story-content";
    content.innerHTML = `<p class="story-eyebrow">AN ENCHANTED TALE FOR TWO</p>
      <h1>Jon and the Beanstalk</h1>
      <p class="story-subtitle">A young wizard. A magical beanstalk. A giant above the clouds.</p>
      <div class="role-cards">
        <section class="role-card"><span class="role-number">PLAYER ONE · LEFT SIDE</span><h2>Jon the Wizard</h2><p>Dodge the giant’s tricks.<br>Keep your adventure alive.</p><strong>Swipe left / right to dodge<br>Swipe up to jump</strong><small>A / D / W · Jump low traps; dodge walls</small></section>
        <section class="role-card giant"><span class="role-number">PLAYER TWO · RIGHT SIDE</span><h2>Be the Giant</h2><p>Guard your kingdom in the clouds.<br>Send obstacles into Jon’s path.</p><strong>Move your hand to aim<br>Close your fist to fire</strong><small>J / K / L: aim · Space: drop · 4s cooldown</small></section>
      </div>
      <button class="story-button" type="button">Enter the enchanted realm</button>
      <p class="start-hint">Click to begin, press Enter, or swipe up · Esc pauses during play</p>
      <p class="camera-hint">Share one webcam. Keep one hand visible in your half.</p>`;
    screen.append(content);
    const mode = document.createElement("select");
    mode.setAttribute("aria-label", "Adventure mode");
    mode.innerHTML = `<option value="campaign">Gemini Adventure · three chapters</option><option value="storybook">Storybook Challenge · five tales</option>`;
    setGameplayMode("campaign");
    mode.addEventListener("change", () =>
      setGameplayMode(mode.value === "storybook" ? "storybook" : "campaign"),
    );
    content.querySelector("button")!.before(mode);
    installStart(this, content.querySelector("button")!);
  }
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("game-over");
  }
  create(result: { score: number; survivedMs: number; outcome?: "caught" | "escaped" }) {
    installShellAudio();
    void loadCampaign();
    const screen = mountShell(this, "story-screen game-over-screen");
    addBeanstalks(screen);
    const content = document.createElement("div");
    content.className = "story-content";
    content.innerHTML = `<p class="story-eyebrow">THIS CHAPTER ENDS</p><h1>The Giant caught Jon!</h1>
      <p class="story-subtitle">Every good tale deserves another try.</p>
      <div class="story-results"><div><strong id="result-score"></strong><span>SCORE</span></div><div><strong id="result-time"></strong><span>SURVIVED</span></div></div>
      <button class="story-button" type="button" disabled>Catch your breath…</button>
      <p class="start-hint">Click replay, press Enter, or swipe up for another adventure</p>`;
    if (result.outcome === "escaped") {
      content.querySelector("h1")!.textContent = "Jon reclaimed the starlight!";
      content.querySelector(".story-eyebrow")!.textContent = "ALL THREE CHAPTERS COMPLETE";
      content.querySelector(".story-subtitle")!.textContent = getCampaign().outro;
    }
    content.querySelector("#result-score")!.textContent = String(result.score);
    content.querySelector("#result-time")!.textContent =
      `${(result.survivedMs / 1000).toFixed(1)}s`;
    screen.append(content);
    const button = content.querySelector("button")!;
    this.time.delayedCall(800, () => {
      button.textContent = "Play again";
      installStart(this, button);
    });
  }
}
