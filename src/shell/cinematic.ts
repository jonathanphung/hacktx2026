import type Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { mountShell } from "./presentation";
import { playCue, startMusic, stopMusic } from "./audio";
import { pixelBars, pixelClaude, pixelGiantHand, pixelLayers } from "./pixel-story";
import { storyParticles, storyRings, spellLetters, SPELL } from "./story-effects";
import {
  crossesGrab,
  crossesShatter,
  ENDING_BEATS,
  GRAB_BEAT,
  HIT_STOP_MS,
  SHATTER_BEAT,
  OPENING_BEATS,
  shakeNoise,
  STAGE,
  STORY_BEAT_MS,
  storyFrame,
} from "./story-timeline";
import { onStoryAdvance } from "./story-controls";

const GRAB_AT = GRAB_BEAT * STORY_BEAT_MS;
const SHATTER_AT = SHATTER_BEAT * STORY_BEAT_MS;
/** Sound hits on the beat (beats from the start), alongside the per-caption voice cues. */
const CUES = {
  opening: [
    { at: 1.35, cue: "blocked" },
    { at: GRAB_BEAT, cue: "attack" },
    { at: 3.45, cue: "end" },
  ],
  ending: [
    { at: 0.05, cue: "relic" },
    { at: SHATTER_BEAT, cue: "victory" },
    { at: 1.96, cue: "step" },
    { at: 2.4, cue: "giant" },
    { at: 3.08, cue: "victory" },
    { at: 3.3, cue: "chapter" },
  ],
} as const;

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
    false,
    `${import.meta.env.BASE_URL}assets/beanstalk/player-stem-v3.png`,
  );
  const dawnSky = pixelLayers(true).sky;
  const particles = Array.from({ length: 150 }, () => '<i class="pixel-particle"></i>').join("");
  const rings = Array.from({ length: 3 }, () => '<i class="pixel-ring"></i>').join("");
  const letters = [...SPELL].map((ch) => `<b class="pixel-letter">${ch}</b>`).join("");
  const sun = `<g class="pixel-sun-body"><g class="pixel-sun-rays" fill="#ffe9a8" opacity=".55">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="-2" y="-30" width="4" height="9" transform="rotate(${i * 45})"/>`).join("")}</g><path fill="#ffb45e" d="M-14-8h28v16h-28zm4-6h20v28h-20zm-8 4h36v20h-36z"/><path fill="#ffe08a" d="M-10-8h20v16h-20zm4-4h12v24h-12z"/><path fill="#fff6dc" d="M-6-6h8v6h-8z"/></g>`;
  screen.innerHTML = `<div class="pixel-film-frame"><header><span>${ending ? "EPILOGUE · THE WAY HOME" : "PROLOGUE · ABOVE THE CLOUDS"}</span><button class="pixel-skip" type="button">Skip story</button></header>
    <div class="pixel-stage" aria-hidden="true"><div class="pixel-camera">
      <div class="pixel-layer" data-depth="0.12"><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.sky}</svg><svg class="pixel-dawn-sky" viewBox="0 0 320 180" shape-rendering="crispEdges">${dawnSky}</svg></div>
      <div class="pixel-layer pixel-sun-layer" data-depth="0.16"><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${sun}</svg></div>
      <div class="pixel-layer" data-depth="0.25"><div class="pixel-cloud-drift"><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.clouds}</svg><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.clouds}</svg></div></div>
      <div class="pixel-layer" data-depth="0.45"><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.far}</svg></div>
      <div class="pixel-layer" data-depth="0.7"><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.mid}</svg></div>
      <div class="pixel-layer pixel-world" data-depth="1"><svg viewBox="0 0 320 180" shape-rendering="crispEdges">${layers.world}</svg><svg class="pixel-cell-overlay" viewBox="0 0 320 180" shape-rendering="crispEdges">${pixelBars}</svg>
        <i class="pixel-shadow"></i>
        <div class="pixel-actor pixel-jon"><div class="pixel-jon-sprite"></div></div>
        <svg class="pixel-actor pixel-claude" viewBox="-16 -20 32 40" shape-rendering="crispEdges">${pixelClaude}</svg>
        <svg class="pixel-actor pixel-hand" viewBox="-24 -70 48 112" shape-rendering="crispEdges">${pixelGiantHand}</svg>
        <i class="pixel-orb"></i><b class="pixel-bubble">!</b>${letters}${particles}${rings}
      </div></div>
      <div class="pixel-dark"></div><div class="pixel-grade"></div>
      <div class="pixel-letterbox top"></div><div class="pixel-letterbox bottom"></div><div class="pixel-vignette"></div><div class="pixel-flash"></div><div class="pixel-title-card"><strong>THE END</strong><span>Jon and Claude are home.</span></div>
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
  const orb = screen.querySelector<HTMLElement>(".pixel-orb")!;
  const shadow = screen.querySelector<HTMLElement>(".pixel-shadow")!;
  const bubble = screen.querySelector<HTMLElement>(".pixel-bubble")!;
  const dark = screen.querySelector<HTMLElement>(".pixel-dark")!;
  const grade = screen.querySelector<HTMLElement>(".pixel-grade")!;
  const titleCard = screen.querySelector<HTMLElement>(".pixel-title-card")!;
  const dawnSkyEl = screen.querySelector<SVGElement>(".pixel-dawn-sky")!;
  const sunBody = screen.querySelector<SVGElement>(".pixel-sun-body")!;
  const sunRays = screen.querySelector<SVGElement>(".pixel-sun-rays")!;
  const particleEls = [...screen.querySelectorAll<HTMLElement>(".pixel-particle")];
  const ringEls = [...screen.querySelectorAll<HTMLElement>(".pixel-ring")];
  const letterEls = [...screen.querySelectorAll<HTMLElement>(".pixel-letter")];
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
    const burst = frame.cellBreak;
    bars.style.opacity = burst >= 1 ? "0" : frame.cell > 0.02 ? String(1 - burst) : "0";
    bars.style.transform = burst
      ? `translateY(${(burst * 70).toFixed(1)}px) rotate(${(burst * 28).toFixed(1)}deg) scale(${(1 + burst * 0.25).toFixed(3)})`
      : `translateY(${((1 - Math.min(1, frame.cell)) * -26).toFixed(2)}px)`;
    hand.style.visibility = frame.hand.visible ? "visible" : "hidden";
    place(hand, frame.hand.x, frame.hand.y, `rotate(${frame.hand.roll.toFixed(2)}deg)`);
    // Wisp, shadow, "!" bubble.
    orb.style.opacity = frame.orb.alpha.toFixed(3);
    place(orb, frame.orb.x, frame.orb.y);
    shadow.style.opacity = frame.shadow.s > 0.01 ? "1" : "0";
    place(
      shadow,
      frame.shadow.x,
      157,
      `scale(${(0.15 + frame.shadow.s * 1.6).toFixed(3)}, ${(0.15 + frame.shadow.s * 1).toFixed(3)})`,
    );
    bubble.style.opacity = frame.bubble.a.toFixed(3);
    place(bubble, frame.bubble.x, frame.bubble.y - (1 - frame.bubble.a) * 6);
    // Mood: darkening before the grab; dawn, sun and warm grade at the end.
    dark.style.opacity = frame.dark.toFixed(3);
    dawnSkyEl.style.opacity = frame.dawn.toFixed(3);
    grade.style.opacity = (frame.dawn * 0.55).toFixed(3);
    sunBody.setAttribute("transform", `translate(70 ${(98 - frame.sun * 52).toFixed(2)})`);
    sunBody.style.opacity = frame.sun > 0.01 ? "1" : "0";
    sunRays.setAttribute("transform", `rotate(${((now / 40) % 360).toFixed(1)})`);
    titleCard.style.opacity = frame.title.toFixed(3);
    titleCard.style.transform = `scale(${(0.9 + frame.title * 0.1).toFixed(3)})`;
    // Sparks, shards, dust and fireworks (all functions of time, drawn from a fixed pool).
    const t = (reduced ? (index + 0.7) * STORY_BEAT_MS : elapsed) / STORY_BEAT_MS;
    const live = reduced ? [] : storyParticles(ending, t);
    particleEls.forEach((el, i) => {
      const p = live[i];
      if (!p) {
        el.style.opacity = "0";
        return;
      }
      el.style.opacity = p.alpha.toFixed(2);
      el.style.background = p.color;
      el.style.width = el.style.height = `${(p.size * unit).toFixed(1)}px`;
      el.style.transform = `translate3d(${(p.x * unit).toFixed(1)}px, ${(p.y * unit).toFixed(1)}px, 0)`;
    });
    const liveRings = reduced ? [] : storyRings(ending, t);
    ringEls.forEach((el, i) => {
      const r = liveRings[i];
      if (!r) {
        el.style.opacity = "0";
        return;
      }
      const d = r.r * 2 * unit;
      el.style.opacity = r.alpha.toFixed(2);
      el.style.width = el.style.height = `${d.toFixed(1)}px`;
      el.style.transform = `translate3d(${((r.x - r.r) * unit).toFixed(1)}px, ${((r.y - r.r) * unit).toFixed(1)}px, 0)`;
    });
    const spell = reduced ? [] : spellLetters(ending, t);
    letterEls.forEach((el, i) => {
      const l = spell[i];
      if (!l) {
        el.style.opacity = "0";
        return;
      }
      el.style.opacity = l.alpha.toFixed(2);
      place(el, l.x, l.y, `scale(${l.scale.toFixed(2)})`);
    });
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
          Math.ceil(((elapsed - index * STORY_BEAT_MS) / (STORY_BEAT_MS * 0.35)) * line.length),
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
      } else if (!reduced && crossesShatter(ending, before, elapsed)) {
        elapsed = Math.max(before, SHATTER_AT);
        frozen = HIT_STOP_MS + 40;
      }
      for (const cue of CUES[ending ? "ending" : "opening"])
        if (before < cue.at * STORY_BEAT_MS && elapsed >= cue.at * STORY_BEAT_MS) playCue(cue.cue);
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
