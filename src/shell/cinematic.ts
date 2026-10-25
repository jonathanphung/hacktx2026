import type Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { mountShell } from "./presentation";
import { playCue, startMusic, stopMusic } from "./audio";
import { pixelLandscape, pixelBars, pixelClaude, pixelGiantHand } from "./pixel-story";
import { ENDING_BEATS, OPENING_BEATS, STORY_BEAT_MS, storyPose } from "./story-timeline";
import { onStoryAdvance } from "./story-controls";

/** Fixed-stage pixel theatre: real game sprites, readable beats, automatic or hand-led pacing. */
export function playCinematic(scene: Phaser.Scene, ending: boolean, onComplete: () => void): void {
  const beats = ending ? ENDING_BEATS : OPENING_BEATS;
  const screen = mountShell(scene, `pixel-film ${ending ? "pixel-ending" : "pixel-opening"}`);
  screen.setAttribute("role", "dialog");
  screen.setAttribute("aria-modal", "true");
  screen.setAttribute(
    "aria-label",
    ending ? "Claude's rescue cinematic" : "Claude's kidnapping cinematic",
  );
  const base = `${import.meta.env.BASE_URL}assets/runner/`;
  screen.innerHTML = `<div class="pixel-film-frame"><header><span>${ending ? "EPILOGUE · THE WAY HOME" : "PROLOGUE · ABOVE THE CLOUDS"}</span><button class="pixel-skip" type="button">Skip story</button></header>
    <div class="pixel-stage" aria-hidden="true"><svg class="pixel-scenery" viewBox="0 0 320 180" shape-rendering="crispEdges">${pixelLandscape(ending)}</svg><svg class="pixel-cell-overlay" viewBox="0 0 320 180" shape-rendering="crispEdges">${pixelBars}</svg>
      <div class="pixel-actor pixel-jon"><div class="pixel-jon-sprite"></div></div>
      <svg class="pixel-actor pixel-claude" viewBox="-16 -20 32 40" shape-rendering="crispEdges">${pixelClaude}</svg>
      <svg class="pixel-actor pixel-hand" viewBox="-24 -70 48 112" shape-rendering="crispEdges">${pixelGiantHand}</svg>
      <div class="pixel-story-label"></div>
    </div>
    <section class="pixel-caption"><div class="pixel-caption-meta"><span class="pixel-speaker"></span><span class="pixel-page"></span></div><h1></h1><p class="pixel-dialogue" aria-live="polite"></p>
      <div class="pixel-story-controls"><span>Wave either hand to continue · Plays automatically</span><button class="pixel-next" type="button">Continue →</button></div><progress max="1" value="0" aria-label="Story progress"></progress>
    </section></div>`;
  const hero = screen.querySelector<HTMLElement>(".pixel-jon")!;
  const sprite = screen.querySelector<HTMLElement>(".pixel-jon-sprite")!;
  const claude = screen.querySelector<SVGElement>(".pixel-claude")!;
  const hand = screen.querySelector<SVGElement>(".pixel-hand")!;
  const bars = screen.querySelector<SVGElement>(".pixel-cell-bars")!;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let elapsed = 0,
    previous = performance.now(),
    lastBeat = -1,
    done = false,
    raf = 0;
  let offMotion = () => {};
  const cleanup = () => {
    cancelAnimationFrame(raf);
    offMotion();
    window.removeEventListener("keydown", onKey, true);
    stopMusic();
  };
  const finish = () => {
    if (done) return;
    done = true;
    cleanup();
    screen.remove();
    onComplete();
  };
  const next = () => {
    if (done) return;
    elapsed = (Math.floor(elapsed / STORY_BEAT_MS) + 1) * STORY_BEAT_MS;
    render();
  };
  const position = (element: HTMLElement | SVGElement, x: number, y: number) => {
    element.style.left = `${x / 3.2}%`;
    element.style.top = `${y / 1.8}%`;
  };
  const render = () => {
    if (elapsed >= beats.length * STORY_BEAT_MS) return finish();
    const index = Math.floor(elapsed / STORY_BEAT_MS);
    const pose = storyPose(ending, reduced ? (index + 0.7) * STORY_BEAT_MS : elapsed);
    position(hero, pose.jon.x, pose.jon.y);
    position(claude, pose.claude.x, pose.claude.y);
    position(hand, pose.hand.x, pose.hand.y);
    bars.style.opacity = pose.bars ? "1" : "0";
    hand.style.visibility = ending || elapsed < STORY_BEAT_MS ? "hidden" : "visible";
    const frame = reduced || !pose.walking ? 0 : Math.floor(elapsed / 80) % 16;
    sprite.style.backgroundImage = `url("${base}${pose.climbing ? "jon-jump.png" : `jon-run${ending ? "-left" : "-right"}.png`}")`;
    sprite.style.backgroundSize = pose.climbing ? "100% 100%" : "1600% 100%";
    sprite.style.backgroundPosition = `${(frame / 15) * 100}% 0`;
    screen.querySelector<HTMLProgressElement>("progress")!.value =
      elapsed / (beats.length * STORY_BEAT_MS);
    if (index !== lastBeat) {
      lastBeat = index;
      const beat = beats[index];
      screen.querySelector(".pixel-speaker")!.textContent = beat.speaker;
      screen.querySelector("h1")!.textContent = beat.title;
      screen.querySelector(".pixel-dialogue")!.textContent = beat.text;
      screen.querySelector(".pixel-page")!.textContent =
        `${String(index + 1).padStart(2, "0")} / ${String(beats.length).padStart(2, "0")}`;
      screen.querySelector(".pixel-story-label")!.textContent = ending
        ? "HOMEWARD"
        : index < 2
          ? "THE ENCHANTED WOODS"
          : "XEN’S TOWER";
      offMotion();
      offMotion = onStoryAdvance(next);
      playCue(beat.speaker === "THE GIANT" ? "giant" : "jon");
    }
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.code === "Tab") {
      event.preventDefault();
      const nextButton = screen.querySelector<HTMLButtonElement>(".pixel-next")!;
      const skipButton = screen.querySelector<HTMLButtonElement>(".pixel-skip")!;
      (document.activeElement === nextButton ? skipButton : nextButton).focus();
      return;
    }
    if (event.repeat) return;
    if (["Escape", "Enter", "Space"].includes(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === "Escape") finish();
      else next();
    }
  };
  const tick = (time: number) => {
    if (done) return;
    elapsed += Math.max(0, Math.min(100, time - previous));
    previous = time;
    render();
    if (!done) raf = requestAnimationFrame(tick);
  };
  screen.querySelector(".pixel-skip")!.addEventListener("click", finish);
  screen.querySelector(".pixel-next")!.addEventListener("click", next);
  window.addEventListener("keydown", onKey, true);
  untilShutdown(scene, () => {
    done = true;
    cleanup();
  });
  screen.querySelector<HTMLButtonElement>(".pixel-next")!.focus();
  startMusic();
  render();
  raf = requestAnimationFrame(tick);
}
