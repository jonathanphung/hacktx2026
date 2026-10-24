import type Phaser from "phaser";
import { untilShutdown, type Emitter } from "../shared/emitter";
import type { GameEvents, PowerupKind } from "../shared/world";
import { ATTACK_BY_ID } from "../game/saboteur/attacks";
import { playCue } from "./audio";
import { installPause } from "./pause";
import { addBeanstalks, mountShell } from "./presentation";

const LANES = ["LEFT", "CENTER", "RIGHT"];
export function installHud(scene: Phaser.Scene, events: Emitter<GameEvents>): void {
  installPause(scene);
  const hud = mountShell(scene, "story-hud");
  addBeanstalks(hud);
  hud.innerHTML += `<div class="hud-score"><span>SCORE</span><strong>0</strong></div>
    <div class="hud-feedback" role="status"></div>
    <section class="hud-jack"><div class="hud-powerups"></div><h2>JACK</h2><p>Swipe to dodge · Swipe up to jump</p><small>A / D / W</small><p class="jump-legend">Jump: hurdles / drifters / oil<br>Dodge: walls / mud</p></section>
    <section class="hud-giant"><h2>GIANT · AIM: CENTER</h2><div class="hud-cards"></div><small>J/K/L: aim · Fist / Space: fire · 1–3: cards</small></section>`;
  const score = hud.querySelector(".hud-score strong")!;
  const feedback = hud.querySelector<HTMLElement>(".hud-feedback")!;
  const aim = hud.querySelector(".hud-giant h2")!;
  const cards = hud.querySelector(".hud-cards")!;
  const activePowerups = new Set<PowerupKind>();
  const powerupNames: Record<PowerupKind, string> = {
    shield: "SHIELD",
    slowmo: "SLOW MOTION",
    double: "2× SCORE",
  };
  let feedbackTimer: Phaser.Time.TimerEvent | undefined;
  const announce = (message: string, positive = false) => {
    feedbackTimer?.remove();
    feedback.textContent = message;
    feedback.classList.toggle("positive", positive);
    feedback.hidden = false;
    feedbackTimer = scene.time.delayedCall(1400, () => {
      feedback.hidden = true;
    });
  };
  untilShutdown(
    scene,
    events.on("score", (e) => {
      score.textContent = String(e.score);
    }),
  );
  untilShutdown(
    scene,
    events.on("hand-changed", ({ hand, selected, aimLane }) => {
      aim.textContent = `GIANT · AIM: ${LANES[aimLane]}`;
      cards.replaceChildren();
      if (!hand.length) {
        const empty = document.createElement("p");
        empty.textContent = "Waiting for the next trick…";
        cards.append(empty);
      }
      hand.forEach((id, i) => {
        const attack = ATTACK_BY_ID.get(id);
        const card = document.createElement("div");
        card.className = `hud-card${i === selected ? " selected" : ""}`;
        card.style.setProperty(
          "--card-color",
          `#${(attack?.color ?? 0x888888).toString(16).padStart(6, "0")}`,
        );
        const name = document.createElement("strong");
        name.textContent = attack?.name ?? id;
        const hint = document.createElement("small");
        hint.textContent = `${i + 1} · ${i === selected ? "SELECTED" : "SELECT"}`;
        const counter = document.createElement("small");
        counter.className = "card-counter";
        counter.textContent = ["hurdle", "drifter", "oil"].includes(id)
          ? "JUMP / DODGE"
          : "DODGE ONLY";
        card.append(name, hint, counter);
        cards.append(card);
      });
    }),
  );
  untilShutdown(
    scene,
    events.on("powerup", ({ kind, active }) => {
      if (active) activePowerups.add(kind);
      else activePowerups.delete(kind);
      hud.querySelector(".hud-powerups")!.textContent = [...activePowerups]
        .map((p) => powerupNames[p])
        .join(" · ");
      if (active) announce(`${powerupNames[kind]} ACTIVE`, true);
    }),
  );
  untilShutdown(
    scene,
    events.on("attack-fired", ({ attackId, lane }) => {
      playCue("attack");
      announce(`${ATTACK_BY_ID.get(attackId)?.name ?? attackId} → ${LANES[lane]}`);
    }),
  );
  untilShutdown(
    scene,
    events.on("runner-hit", ({ effect }) => {
      if (activePowerups.has("shield")) {
        announce("SHIELD BLOCKED THE HIT!", true);
        return;
      }
      playCue(effect === "slow" ? "slow" : "end");
      announce(effect === "slow" ? "JACK SLOWED!" : "JACK CAUGHT!");
    }),
  );
  untilShutdown(
    scene,
    events.on("game-over", () => scene.events.emit("shell-run-ended")),
  );
}
