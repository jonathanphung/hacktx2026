import type Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { mountShell } from "./presentation";
import { playCue, startMusic, stopMusic } from "./audio";
import { towerArt } from "./story";

const companion = `<path d="m-21 0 5-27q16-15 32 0l5 27z" fill="#db9c78"/><path d="m-16-25-3-20 17 11m8 0 15-11-4 23" fill="#db9c78"/><circle cx="-7" cy="-19" r="2" fill="#2c233b"/><circle cx="8" cy="-19" r="2" fill="#2c233b"/><path d="M-15-4h30l-3 8h-24z" fill="#b4e5d3"/><path d="m8 3 9 16" stroke="#b4e5d3" stroke-width="6"/>`;

/** One continuously animated scene; only the subtitles change over the timeline. */
export function playCinematic(scene: Phaser.Scene, ending: boolean, onComplete: () => void): void {
  const screen = mountShell(scene, `film-screen ${ending ? "film-ending" : "film-opening"}`);
  screen.setAttribute("role", "dialog");
  screen.setAttribute("aria-modal", "true");
  screen.setAttribute(
    "aria-label",
    ending ? "Claude's rescue cinematic" : "Claude's kidnapping cinematic",
  );
  const tower = towerArt(ending)
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "")
    .replace(/<rect width="800" height="260"[^>]*\/>/, "")
    .replace(/<circle cx="560"[^>]*\/>/, "")
    .replace(/<path d="M0 235[^>]*\/>/, "");
  screen.innerHTML = `<div class="film-letterbox film-top"><span>JON AND THE BEANSTALK</span><button type="button">Skip cinematic · Esc</button></div><div class="film-world"><svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="film-sky" x2="0" y2="1"><stop stop-color="#171a3c"/><stop offset="1" stop-color="${ending ? "#dea786" : "#8c688f"}"/></linearGradient></defs><rect width="1000" height="560" fill="url(#film-sky)"/><circle cx="730" cy="95" r="53" fill="#fff0cc" opacity=".75"/><g class="film-stars" fill="#ffe7b7">${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 167 + 41) % 1000}" cy="${(i * 71 + 13) % 330}" r="${(i % 3) + 1}"/>`).join("")}</g><g class="film-clouds" fill="#d5c3e4" opacity=".25"><ellipse cx="250" cy="160" rx="200" ry="32"/><ellipse cx="850" cy="250" rx="230" ry="38"/></g><g class="film-camera"><path d="M-100 530Q140 300 420 465T1150 440V700H-100" fill="#3e4662"/><path d="M-100 570Q250 360 550 500T1200 500V700H-100" fill="#283e4d"/><svg class="film-tower" x="470" y="15" width="560" height="400" viewBox="0 0 800 260">${tower}</svg><path d="M600 630Q780 430 638 210T680-80" fill="none" stroke="#60875c" stroke-width="35"/><path d="M600 630Q780 430 638 210T680-80" fill="none" stroke="#9cbd7d" stroke-width="10"/><g fill="#88ae70"><ellipse cx="666" cy="350" rx="50" ry="19" transform="rotate(-30 666 350)"/><ellipse cx="660" cy="185" rx="50" ry="19" transform="rotate(30 660 185)"/></g><path d="M70 510q200-80 425-10" fill="none" stroke="#b6a582" stroke-width="28"/><g class="film-jon"><g transform="translate(240 450) scale(1.2)"><svg data-runner-sprite x="-80" y="-155" width="160" height="170" viewBox="0 0 128 128"><image href="${import.meta.env.BASE_URL}assets/runner/jon-run${ending ? "-left" : "-right"}.png" width="2048" height="128" style="image-rendering:pixelated"/></svg><image class="film-jump-sprite" visibility="hidden" x="-80" y="-155" width="160" height="170" href="${import.meta.env.BASE_URL}assets/runner/jon-jump.png" style="image-rendering:pixelated"/></g></g><g class="film-claude"><g transform="translate(330 445) scale(1.2)">${companion}</g></g><g class="film-giant"><g transform="translate(405 170)"><path d="M-85 80q85-100 170 0v100H-85" fill="#59406e"/><ellipse cy="0" rx="63" ry="67" fill="#c19472"/><path d="m-60-25 8-65h104l8 65" fill="#3f2d50"/><path d="m-35-3 22-6m10 0 25 6m-40 33q20 15 41-2" fill="none" stroke="#614254" stroke-width="8"/><path class="film-hand" d="M65 90q120 60 165 190l-45 25q-50-100-155-110" fill="#c19472"/></g></g><g class="film-magic" fill="#c2ffe1">${Array.from({ length: 15 }, (_, i) => `<circle cx="${250 + i * 27}" cy="${400 - Math.sin(i) * 35}" r="${(i % 4) + 2}"/>`).join("")}</g></g></svg></div><div class="film-letterbox film-bottom"><p class="film-speaker"></p><p class="film-caption" aria-live="polite"></p><progress aria-label="Cinematic progress" max="1" value="0"></progress></div>`;
  const skip = screen.querySelector<HTMLButtonElement>("button")!;
  const captions = ending
    ? ([
        [0, "CLAUDE", "About time."],
        [4, "JON", "The door’s open. Can you walk?"],
        [9, "CLAUDE", "Yeah. Let’s go before he comes back."],
        [13, "JON", "Stay close. There’s a way down."],
        [17, "TOGETHER AGAIN", "By morning, the tower was behind them."],
      ] as const)
    : ([
        [
          0,
          "JON",
          "One quiet evening, Jon and his companion Claude followed a light into the woods.",
        ],
        [4, "THE GIANT", "A wizard’s companion? You’ll make a fine guest in my highest cell!"],
        [8, "CLAUDE", "Jon! The tower—find the hidden message!"],
        [
          12,
          "THE GIANT",
          "Five tales hold the clues. My keeper holds the last. Climb if you dare.",
        ],
        [16, "JON", "Hold on, Claude. Whatever it takes, I’m coming for you."],
      ] as const);
  let done = false,
    lastCaption = -1;
  const start = performance.now();
  const duration = ending ? 21000 : 20000;
  let timer: ReturnType<typeof setInterval> | undefined;
  const cleanup = () => {
    clearInterval(timer);
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
  const onKey = (event: KeyboardEvent) => {
    if (event.code === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      finish();
    } else if (event.code === "Tab") {
      event.preventDefault();
      skip.focus();
    }
  };
  const tick = () => {
    const elapsed = performance.now() - start;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = reduced ? 0 : Math.floor(elapsed / 60) % 16;
    const runner = screen.querySelector("[data-runner-sprite]")!;
    runner.setAttribute("viewBox", `${frame * 128} 0 128 128`);
    const climbing = !ending && elapsed > 15000;
    runner.setAttribute("visibility", climbing ? "hidden" : "visible");
    screen
      .querySelector(".film-jump-sprite")!
      .setAttribute("visibility", climbing ? "visible" : "hidden");
    screen.querySelector<HTMLProgressElement>("progress")!.value = elapsed / duration;
    let index = 0;
    captions.forEach(([at], i) => {
      if (elapsed >= at * 1000) index = i;
    });
    if (index !== lastCaption) {
      lastCaption = index;
      const [, speaker, text] = captions[index];
      screen.querySelector(".film-speaker")!.textContent = speaker;
      screen.querySelector(".film-caption")!.textContent = text;
      playCue(speaker === "THE GIANT" ? "giant" : "jon");
      if (!ending && index === 2) playCue("attack");
      if (ending && index === 3) playCue("relic");
    }
    if (elapsed >= duration) finish();
  };
  skip.addEventListener("click", finish);
  window.addEventListener("keydown", onKey, true);
  untilShutdown(scene, () => {
    done = true;
    cleanup();
  });
  startMusic();
  timer = setInterval(tick, 60);
  tick();
  skip.focus();
}
