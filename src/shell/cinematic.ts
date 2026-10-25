import type Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { mountShell } from "./presentation";
import { playCue, startMusic, stopMusic } from "./audio";
import { pixelBars, pixelClaude, pixelGiantHand, pixelLayers } from "./pixel-story";
import {
  crossesGrab,
  ENDING_BEATS,
  GRAB_BEAT,
  HIT_STOP_MS,
  OPENING_BEATS,
  shakeNoise,
  STAGE,
  STORY_BEAT_MS,
  storyFrame,
} from "./story-timeline";
import { onStoryAdvance } from "./story-controls";

const GRAB_AT = GRAB_BEAT * STORY_BEAT_MS;

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
  const layers = pixelLayers(
    ending,
    `${import.meta.env.BASE_URL}assets/beanstalk/stem-tile-sm.png`,
  );
  screen.innerHTML = `<div class="pixel-film-frame"><header><span>${ending ? "EPILOGUE · THE WAY HOME" : "PROLOGUE · ABOVE THE CLOUDS"}</span><button class="pixel-skip" type="button">Skip story</button></header>
    <div class="pixel-stage" aria-hidden="true"><div class="pixel-camera">
      <div class="pixel-layer" data-depth="0.12"><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.sky}</svg></div>
      <div class="pixel-layer" data-depth="0.25"><div class="pixel-cloud-drift"><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.clouds}</svg><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.clouds}</svg></div></div>
      <div class="pixel-layer" data-depth="0.45"><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.far}</svg></div>
      <div class="pixel-layer" data-depth="0.7"><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.mid}</svg></div>
      <div class="pixel-layer pixel-world" data-depth="1"><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.world}</svg><svg class="pixel-cell-overlay" viewBox="0 0 320 180" shape-rendering="crispEdges">${pixelBars}</svg>
        <div class="pixel-actor pixel-jon"><div class="pixel-jon-sprite"></div></div>
        <svg class="pixel-actor pixel-claude" viewBox="-16 -20 32 40" shape-rendering="crispEdges">${pixelClaude}</svg>
        <svg class="pixel-actor pixel-hand" viewBox="-24 -70 48 112" shape-rendering="crispEdges">${pixelGiantHand}</svg>
      </div></div>
      <div class="pixel-letterbox top"></div><div class="pixel-letterbox bottom"></div><div class="pixel-vignette"></div><div class="pixel-flash"></div>
      <div class="pixel-story-label"></div>
    </div>
    <section class="pixel-caption"><div class="pixel-caption-meta"><span class="pixel-speaker"></span><span class="pixel-page"></span></div><h1></h1><p class="pixel-dialogue" aria-hidden="true"></p><p class="pixel-sr" aria-live="polite"></p>
      <div class="pixel-story-controls"><span>Wave either hand to continue · Plays automatically</span><button class="pixel-next" type="button">Continue →</button></div><progress max="1" value="0" aria-label="Story progress"></progress>
    </section></div>`;
  const stage = screen.querySelector<HTMLElement>(".pixel-stage")!;
  const camera = screen.querySelector<HTMLElement>(".pixel-camera")!;
  const layerEls = [...screen.querySelectorAll<HTMLElement>(".pixel-layer")].map((el) => ({
    el,
    depth: Number(el.dataset.depth),
  }));
  const hero = screen.querySelector<HTMLElement>(".pixel-jon")!;
  const sprite = screen.querySelector<HTMLElement>(".pixel-jon-sprite")!;
  const claude = screen.querySelector<SVGElement>(".pixel-claude")!;
  const hand = screen.querySelector<SVGElement>(".pixel-hand")!;
  const bars = screen.querySelector<SVGElement>(".pixel-cell-bars")!;
  const flash = screen.querySelector<HTMLElement>(".pixel-flash")!;
  const barTop = screen.querySelector<HTMLElement>(".pixel-letterbox.top")!;
  const barBottom = screen.querySelector<HTMLElement>(".pixel-letterbox.bottom")!;
  const dialogue = screen.querySelector<HTMLElement>(".pixel-dialogue")!;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let elapsed = 0,
    previous = performance.now(),
    lastBeat = -1,
    done = false,
    raf = 0,
    frozen = 0,
    unit = stage.clientWidth / STAGE.w || 1;
  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          unit = stage.clientWidth / STAGE.w || 1;
        });
  observer?.observe(stage);
  let offMotion = () => {};
  const cleanup = () => {
    cancelAnimationFrame(raf);
    observer?.disconnect();
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
    render(performance.now());
  };
  /** Everything moves with transforms (GPU-composited, sub-pixel), never left/top. */
  const place = (element: HTMLElement | SVGElement, x: number, y: number, extra = "") => {
    element.style.transform = `translate3d(${(x * unit).toFixed(2)}px, ${(y * unit).toFixed(2)}px, 0) translate(-50%, -50%) ${extra}`;
  };
  // Development review aid: ?story-at=5600 freezes the film at that moment (in ms).
  const scrub = import.meta.env.DEV
    ? Number(new URLSearchParams(location.search).get("story-at") ?? NaN)
    : NaN;
  if (Number.isFinite(scrub)) elapsed = scrub;
  let typed = "";
  const render = (now: number) => {
    const total = beats.length * STORY_BEAT_MS;
    if (elapsed >= total) return finish();
    const index = Math.floor(elapsed / STORY_BEAT_MS);
    const frame = storyFrame(ending, reduced ? (index + 0.7) * STORY_BEAT_MS : elapsed);
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    // Camera: every layer shares the zoom, but slides by a fraction of the pan (parallax).
    const { x: cx, y: cy, zoom, roll } = frame.camera;
    const jitter = reduced ? 0 : frame.shake;
    const sx = shakeNoise(now, 1) * jitter;
    const sy = shakeNoise(now, 2) * jitter;
    for (const { el, depth } of layerEls) {
      const fx = STAGE.w / 2 + (cx - STAGE.w / 2) * depth + sx;
      const fy = STAGE.h / 2 + (cy - STAGE.h / 2) * depth + sy;
      el.style.transform = `translate3d(${(W / 2 - fx * unit * zoom).toFixed(2)}px, ${(H / 2 - fy * unit * zoom).toFixed(2)}px, 0) scale(${zoom.toFixed(4)})`;
    }
    camera.style.transform = reduced
      ? ""
      : `rotate(${(roll + shakeNoise(now, 3) * jitter * 0.15).toFixed(3)}deg)`;
    place(hero, frame.jon.x, frame.jon.y - frame.jon.bob);
    place(claude, frame.claude.x, frame.claude.y, `rotate(${frame.claude.roll.toFixed(2)}deg)`);
    place(hand, frame.hand.x, frame.hand.y);
    bars.style.opacity = frame.cell > 0.02 ? "1" : "0";
    bars.style.transform = `translateY(${((1 - Math.min(1, frame.cell)) * -26).toFixed(2)}px)`;
    hand.style.visibility = frame.hand.visible ? "visible" : "hidden";
    flash.style.opacity = reduced ? "0" : frame.flash.toFixed(3);
    barTop.style.transform = barBottom.style.transform = "";
    barTop.style.height = barBottom.style.height = `${(frame.letterbox * 8).toFixed(2)}%`;
    const running = !reduced && frame.jon.state === "run";
    const spriteFrame = running ? Math.floor(elapsed / 55) % 16 : 0;
    const climbing = frame.jon.state === "jump";
    sprite.style.backgroundImage = `url("${base}${climbing ? "jon-jump.png" : `jon-run${ending ? "-left" : "-right"}.png`}")`;
    sprite.style.backgroundSize = climbing ? "100% 100%" : "1600% 100%";
    sprite.style.backgroundPosition = `${(spriteFrame / 15) * 100}% 0`;
    screen.querySelector<HTMLProgressElement>("progress")!.value = elapsed / total;
    if (index !== lastBeat) {
      lastBeat = index;
      const beat = beats[index];
      screen.querySelector(".pixel-speaker")!.textContent = beat.speaker;
      screen.querySelector("h1")!.textContent = beat.title;
      screen.querySelector(".pixel-sr")!.textContent = beat.text;
      typed = "";
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
    // Typewriter: letters pop in over the first half of the beat; the full line is announced once.
    const line = beats[index].text;
    const shown = reduced
      ? line
      : line.slice(
          0,
          Math.ceil(((elapsed - index * STORY_BEAT_MS) / (STORY_BEAT_MS * 0.5)) * line.length),
        );
    if (shown !== typed) {
      typed = shown;
      dialogue.textContent = shown;
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
    const dt = Math.max(0, Math.min(100, time - previous));
    previous = time;
    if (Number.isFinite(scrub)) {
      // Held on a single moment: keep rendering (so shake and the typewriter settle), no advance.
    } else if (frozen > 0) {
      // Hit-stop: the world holds for a beat of impact while the shake keeps rattling.
      frozen -= dt;
    } else {
      const before = elapsed;
      elapsed += dt;
      if (!reduced && crossesGrab(ending, before, elapsed)) {
        elapsed = Math.max(before, GRAB_AT);
        frozen = HIT_STOP_MS;
        playCue("attack");
      }
    }
    render(time);
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
  render(performance.now());
  raf = requestAnimationFrame(tick);
}
