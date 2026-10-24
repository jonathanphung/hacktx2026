import { STAGES } from "../shared/stages";
import type Phaser from "phaser";
import { untilShutdown, type Emitter } from "../shared/emitter";
import type { GameEvents, PowerupKind } from "../shared/world";
import { ATTACK_BY_ID } from "../game/saboteur/attacks";
import { playCue, playObstacle, startMusic, stopMusic, setMusicStage } from "./audio";
import { installPause } from "./pause";
import { addBeanstalks, mountShell } from "./presentation";
import { letterMarkup, REWARDS, taleLabel } from "./story";

const LANES = ["LEFT", "CENTER", "RIGHT"];
export function installHud(scene: Phaser.Scene, events: Emitter<GameEvents>): void {
  installPause(scene);
  startMusic();
  untilShutdown(scene, stopMusic);
  const hud = mountShell(scene, "story-hud");
  addBeanstalks(hud);
  hud.innerHTML += `<div class="hud-score"><span>SCORE</span><strong>0</strong></div>
    <div class="hud-level"><strong></strong><span></span><div class="hud-spell spell-word"></div><small class="hud-relics"></small></div>
    <div class="hud-feedback" role="status"></div><aside class="hud-discovery" role="status" hidden><strong></strong><span></span></aside>
    <section class="hud-jon"><div class="hud-powerups"></div><h2>JON</h2><small>A / D: dodge · W: jump</small></section>
    <section class="hud-giant"><h2>GIANT · AIM: CENTER</h2><div class="hud-cards"></div><small>J/K/L: aim · Space: drop</small></section>`;
  const score = hud.querySelector(".hud-score strong")!;
  const feedback = hud.querySelector<HTMLElement>(".hud-feedback")!;
  const aim = hud.querySelector(".hud-giant h2")!;
  const cards = hud.querySelector(".hud-cards")!;
  let cooling = false;
  let lastAim = 1;
  let discoveryTimer: Phaser.Time.TimerEvent | undefined;
  const discovery = hud.querySelector<HTMLElement>(".hud-discovery")!;
  setMusicStage(0);
  const cooldownLabel = document.createElement("p");
  cooldownLabel.className = "cooldown-label";
  hud.querySelector(".hud-level strong")!.textContent = taleLabel(0);
  hud.querySelector(".hud-spell")!.innerHTML = letterMarkup(0);
  hud.querySelector(".hud-level span")!.textContent = `Find ${STAGES[0].item.name}`;
  untilShutdown(
    scene,
    events.on("stage-changed", ({ index }) => {
      hud.querySelector(".hud-level strong")!.textContent = taleLabel(index);
      hud.querySelector(".hud-level span")!.textContent = `Find ${STAGES[index].item.name}`;
      playCue("chapter");
      setMusicStage(index);
    }),
  );
  untilShutdown(
    scene,
    events.on("stage-item", ({ state, stage }) => {
      if (state === "collected") {
        playCue("clue");
        playCue("relic");
        hud.querySelector(".hud-spell")!.innerHTML = letterMarkup(stage + 1);
        hud.querySelector(".hud-relics")!.textContent =
          `${stage + 1} ${stage === 0 ? "relic" : "relics"}`;
        discoveryTimer?.remove();
        discovery.querySelector("strong")!.textContent =
          `Clue found: ${"HACKTX"[stage]} · ${REWARDS[stage][0]}`;
        discovery.querySelector("span")!.textContent = REWARDS[stage][1];
        discovery.hidden = false;
        discoveryTimer = scene.time.delayedCall(4500, () => {
          discovery.hidden = true;
        });
      } else if (state === "spawned") playCue("spawn");
    }),
  );
  let nextStep = 0;
  let ended = false;
  const footsteps = (time: number) => {
    if (!ended && time >= nextStep) {
      playCue("step");
      nextStep = time + 420;
    }
  };
  scene.events.on("update", footsteps);
  untilShutdown(scene, () => scene.events.off("update", footsteps));
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
      if (aimLane !== lastAim) playCue("aim");
      lastAim = aimLane;
      aim.textContent = `GIANT · ${LANES[aimLane]}`;
      cards.replaceChildren();
      if (cooling && hand.length) playCue("ready");
      cooling = !hand.length;
      if (!hand.length) {
        const empty = document.createElement("p");
        empty.textContent = "Recharging magic…";
        cards.append(empty, cooldownLabel);
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
        hint.textContent = i === 0 ? "NEXT TO DROP" : `QUEUED ${i + 1}`;
        const counter = document.createElement("small");
        counter.className = "card-counter";
        counter.textContent = ["hurdle", "oil"].includes(id) ? "JUMP / DODGE" : "DODGE ONLY";
        card.append(name, hint, counter);
        cards.append(card);
      });
    }),
  );
  untilShutdown(
    scene,
    events.on("saboteur-status", ({ state, remainingMs }) => {
      cooldownLabel.textContent =
        state === "queued"
          ? `DROPPING IN ${(remainingMs / 1000).toFixed(1)}s`
          : `NEXT DROP IN ${(remainingMs / 1000).toFixed(1)}s`;
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
      if (!active) playCue("expire");
      if (active) {
        playCue("pickup");
        announce(`${powerupNames[kind]} ACTIVE`, true);
      }
    }),
  );
  untilShutdown(
    scene,
    events.on("cast-result", (r) => {
      // The game, not vision, decides whether a drop was accepted.
      if (!r.accepted && r.reason === "cooldown")
        announce(`NOT READY · ${(r.remainingMs / 1000).toFixed(1)}s`);
    }),
  );
  untilShutdown(
    scene,
    events.on("attack-fired", ({ attackId, lane }) => {
      announce(`${ATTACK_BY_ID.get(attackId)?.name ?? attackId} → ${LANES[lane]}`);
    }),
  );
  untilShutdown(
    scene,
    events.on("runner-hit", ({ kind, effect, blocked, shieldBroken }) => {
      if (blocked || activePowerups.has("shield")) {
        if (shieldBroken ?? activePowerups.has("shield")) playCue("glass");
        announce("SHIELD BLOCKED THE HIT!", true);
        return;
      }
      playObstacle(kind);
      if (effect !== "slow") playCue("end");
      announce(effect === "slow" ? "JON SLOWED!" : "JON CAUGHT!");
    }),
  );
  untilShutdown(
    scene,
    events.on("obstacle-spawned", ({ kind }) => playObstacle(kind)),
  );
  untilShutdown(
    scene,
    events.on("runner-action", ({ action }) => playCue(action === "jump" ? "jump" : "dodge")),
  );
  untilShutdown(
    scene,
    events.on("cast-result", (result) => playCue(result.accepted ? "giant" : "blocked")),
  );
  untilShutdown(
    scene,
    events.on("game-over", () => {
      ended = true;
      stopMusic();
      scene.events.emit("shell-run-ended");
    }),
  );
}
