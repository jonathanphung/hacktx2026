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
    <g fill="none" stroke="url(#vine)" stroke-width="22"><path d="M100 750 C210 590 65 480 150 320 S80 90 175 -50"/><path d="M1190 750 C1080 590 1215 480 1130 320 S1200 90 1105 -50"/></g>
    <g fill="#75a94d" stroke="#366c3e" stroke-width="3">
    <path d="M135 580 Q30 580 48 510 Q130 495 135 580 M145 425 Q250 425 233 355 Q150 345 145 425 M132 240 Q30 240 48 170 Q125 160 132 240 M1170 580 Q1265 580 1247 510 Q1170 495 1170 580 M1135 425 Q1030 425 1047 355 Q1130 345 1135 425 M1148 240 Q1250 240 1232 170 Q1155 160 1148 240"/>
    </g><g fill="#f8f5df" opacity=".7"><ellipse cx="90" cy="80" rx="170" ry="35"/><ellipse cx="1200" cy="120" rx="190" ry="38"/><ellipse cx="80" cy="680" rx="190" ry="42"/><ellipse cx="1200" cy="690" rx="190" ry="45"/></g>
    <g class="fairy-glow" fill="#fff6b5"><circle cx="250" cy="90" r="4"/><circle cx="1030" cy="160" r="4"/><circle cx="70" cy="390" r="5"/><circle cx="1200" cy="440" r="5"/><circle cx="220" cy="610" r="4"/><circle cx="1070" cy="590" r="3"/></g>
    <g fill="#fff0b2"><path d="M265 45 l4 13 13 4 -13 4 -4 13 -4 -13 -13 -4 13 -4z M1000 65 l3 10 10 3 -10 3 -3 10 -3 -10 -10 -3 10 -3z M54 300 l4 13 13 4 -13 4 -4 13 -4 -13 -13 -4 13 -4z"/></g>
    <g transform="translate(100 575)"><ellipse fill="#e9c9ff" cx="-12" cy="-8" rx="15" ry="25" transform="rotate(-30)"/><ellipse fill="#f9dcff" cx="12" cy="-8" rx="15" ry="25" transform="rotate(30)"/><circle fill="#ffe3b0" cy="-15" r="6"/><path fill="#c293df" d="M0 -10 l-10 28 20 0z"/></g>
    <g transform="translate(1190 300) scale(.75)"><ellipse fill="#d3f6ed" cx="-12" cy="-8" rx="15" ry="25" transform="rotate(-30)"/><ellipse fill="#f9dcff" cx="12" cy="-8" rx="15" ry="25" transform="rotate(30)"/><circle fill="#ffe3b0" cy="-15" r="6"/><path fill="#d18ed3" d="M0 -10 l-10 28 20 0z"/></g>
    <g fill="#d7b9df" stroke="#9b80b3" stroke-width="2" opacity=".7"><path d="M1000 115 v-50 h20 v15 h20 v-30 h22 v30 h20 v-15 h20 v50z"/><path fill="#9c7db1" d="M1033 50 l18 -25 18 25z"/></g>
    <g transform="translate(45 680)"><path fill="#f9e5ce" d="M-7 0 v-30 h14 v30z"/><path fill="#c680ab" d="M-30 -27 Q0 -70 30 -27z"/><g fill="#fff6e5"><circle cx="-10" cy="-37" r="4"/><circle cx="9" cy="-42" r="4"/></g></g>
    <g transform="translate(1230 675) scale(.8)"><path fill="#f9e5ce" d="M-7 0 v-30 h14 v30z"/><path fill="#b37ccc" d="M-30 -27 Q0 -70 30 -27z"/><g fill="#fff6e5"><circle cx="-10" cy="-37" r="4"/><circle cx="9" cy="-42" r="4"/></g></g>
    <g fill="#e5b3df"><circle cx="160" cy="260" r="9"/><circle cx="170" cy="250" r="9"/><circle cx="180" cy="260" r="9"/><circle cx="170" cy="270" r="9"/></g><circle fill="#ffdfa0" cx="170" cy="260" r="6"/>
    </svg>`;
  parent.prepend(art);
}
