import type Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";

/** Browser-rendered text stays sharp independently of the scaled game canvas. */
export function mountShell(scene: Phaser.Scene, className: string): HTMLDivElement {
  const element = document.createElement("div");
  element.className = className;
  document.getElementById("stage")?.append(element);
  untilShutdown(scene, () => element.remove());
  return element;
}

export function addBeanstalks(parent: HTMLElement): void {
  const art = document.createElement("div");
  art.className = "beanstalk-art";
  art.setAttribute("aria-hidden", "true");
  art.innerHTML = `<svg viewBox="0 0 1280 720" preserveAspectRatio="none">
    <defs><linearGradient id="vine" x2="1"><stop stop-color="#245d35"/><stop offset=".5" stop-color="#8fbd58"/><stop offset="1" stop-color="#306e40"/></linearGradient></defs>
    <g fill="#f8f5df" opacity=".7"><ellipse cx="90" cy="80" rx="170" ry="35"/><ellipse cx="1200" cy="120" rx="190" ry="38"/><ellipse cx="80" cy="680" rx="190" ry="42"/><ellipse cx="1200" cy="690" rx="190" ry="45"/></g>
    <g class="fairy-glow" fill="#fff6b5"><circle cx="250" cy="90" r="4"/><circle cx="1030" cy="160" r="4"/><circle cx="70" cy="390" r="5"/><circle cx="1200" cy="440" r="5"/><circle cx="220" cy="610" r="4"/><circle cx="1070" cy="590" r="3"/></g>
    <g fill="#fff0b2"><path d="M265 45 l4 13 13 4 -13 4 -4 13 -4 -13 -13 -4 13 -4z M1000 65 l3 10 10 3 -10 3 -3 10 -3 -10 -10 -3 10 -3z M54 300 l4 13 13 4 -13 4 -4 13 -4 -13 -13 -4 13 -4z"/></g>
    <g transform="translate(100 575)"><ellipse fill="#e9c9ff" cx="-12" cy="-8" rx="15" ry="25" transform="rotate(-30)"/><ellipse fill="#f9dcff" cx="12" cy="-8" rx="15" ry="25" transform="rotate(30)"/><circle fill="#ffe3b0" cy="-15" r="6"/><path fill="#c293df" d="M0 -10 l-10 28 20 0z"/></g>
    <g transform="translate(1190 300) scale(.75)"><ellipse fill="#d3f6ed" cx="-12" cy="-8" rx="15" ry="25" transform="rotate(-30)"/><ellipse fill="#f9dcff" cx="12" cy="-8" rx="15" ry="25" transform="rotate(30)"/><circle fill="#ffe3b0" cy="-15" r="6"/><path fill="#d18ed3" d="M0 -10 l-10 28 20 0z"/></g>
    <g transform="translate(45 680)"><path fill="#f9e5ce" d="M-7 0 v-30 h14 v30z"/><path fill="#c680ab" d="M-30 -27 Q0 -70 30 -27z"/><g fill="#fff6e5"><circle cx="-10" cy="-37" r="4"/><circle cx="9" cy="-42" r="4"/></g></g>
    <g transform="translate(1230 675) scale(.8)"><path fill="#f9e5ce" d="M-7 0 v-30 h14 v30z"/><path fill="#b37ccc" d="M-30 -27 Q0 -70 30 -27z"/><g fill="#fff6e5"><circle cx="-10" cy="-37" r="4"/><circle cx="9" cy="-42" r="4"/></g></g>
    <g fill="#e5b3df"><circle cx="160" cy="260" r="9"/><circle cx="170" cy="250" r="9"/><circle cx="180" cy="260" r="9"/><circle cx="170" cy="270" r="9"/></g><circle fill="#ffdfa0" cx="170" cy="260" r="6"/>
    </svg>`;
  // The pixel-art beanstalk tiles down both edges, behind the clouds and fairies.
  const tile = `${import.meta.env.BASE_URL}assets/beanstalk/player-stem-v3.png`;
  for (const side of ["left", "right"]) {
    const vine = document.createElement("div");
    vine.className = `beanstalk-vine ${side}`;
    vine.style.backgroundImage = `url(${tile})`;
    art.prepend(vine);
  }
  parent.prepend(art);
}
