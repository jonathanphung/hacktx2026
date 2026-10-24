import { campaignLevelAt, getGameplayMode } from "../shared/campaign";
import { STAGES } from "../shared/stages";
import type Phaser from "phaser";
import { untilShutdown, type Emitter } from "../shared/emitter";
import type { GameEvents, PowerupKind } from "../shared/world";
import { ATTACK_BY_ID } from "../game/saboteur/attacks";
import { SABOTEUR } from "../game/saboteur/config";
import { playCue, startMusic, stopMusic } from "./audio";
import { installPause } from "./pause";
import { addBeanstalks, mountShell } from "./presentation";

const LANES = ["LEFT", "CENTER", "RIGHT"];
export function installHud(scene: Phaser.Scene, events: Emitter<GameEvents>): void {
  installPause(scene);
  startMusic();
  untilShutdown(scene, stopMusic);
  const campaignMode = getGameplayMode() === "campaign";
  const hud = mountShell(scene, "story-hud");
  addBeanstalks(hud);
  hud.innerHTML += `<div class="hud-score"><span>SCORE</span><strong>0</strong></div>
    <div class="hud-level"><strong></strong><span></span><progress aria-label="Chapter progress"></progress></div>
    <div class="hud-feedback" role="status"></div>
    <section class="hud-jon"><div class="hud-powerups"></div><h2>JON</h2><p>Swipe to dodge · Swipe up to jump</p><small>A / D / W</small><p class="jump-legend">Jump: logs / thorns / oil / sap<br>Dodge: rocks / walls / mud / fireballs</p></section>
    <section class="hud-giant"><h2>GIANT · AIM: CENTER</h2><div class="hud-cards"></div><small>J/K/L: aim · Fist / Space: drop · 4s cooldown</small></section>`;
  const score = hud.querySelector(".hud-score strong")!;
  const feedback = hud.querySelector<HTMLElement>(".hud-feedback")!;
  const aim = hud.querySelector(".hud-giant h2")!;
  const cards = hud.querySelector(".hud-cards")!;
  let lastTime = 0;
  let runStartedAt = -1;
  let lastChapter = -1;
  let cooldownUntil = 0;
  let cooling = false;
  const cooldownLabel = document.createElement("p");
  cooldownLabel.className = "cooldown-label";
  const updateCooldown = (time: number) => {
    lastTime = time;
    if (!campaignMode) return;
    if (runStartedAt < 0) runStartedAt = time;
    const stage = campaignLevelAt((time - runStartedAt) / 1000);
    hud.dataset.theme = stage.level.theme;
    const chapterName = hud.querySelector(".hud-level strong")!;
    const name = `CHAPTER ${stage.index + 1}/3 · ${stage.level.name}`;
    if (chapterName.textContent !== name) chapterName.textContent = name;
    hud.querySelector(".hud-level span")!.textContent = `${Math.ceil(stage.remainingSec)}s`;
    const progress = hud.querySelector<HTMLProgressElement>(".hud-level progress")!;
    progress.max = stage.level.durationSec;
    progress.value = stage.level.durationSec - stage.remainingSec;
    if (lastChapter >= 0 && stage.index !== lastChapter) {
      playCue("chapter");
      announce(stage.level.description, true);
    }
    lastChapter = stage.index;
    if (cooling)
      cooldownLabel.textContent = `NEXT DROP IN ${Math.max(0, (cooldownUntil - time) / 1000).toFixed(1)}s`;
  };
  scene.events.on("update", updateCooldown);
  untilShutdown(scene, () => scene.events.off("update", updateCooldown));
  if (!campaignMode) {
    hud.querySelector(".hud-level strong")!.textContent = STAGES[0].name;
    hud.querySelector(".hud-level span")!.textContent = `Find ${STAGES[0].item.name}`;
    hud.querySelector<HTMLProgressElement>(".hud-level progress")!.hidden = true;
  }
  untilShutdown(
    scene,
    events.on("stage-changed", ({ index, name }) => {
      hud.querySelector(".hud-level strong")!.textContent = name;
      hud.querySelector(".hud-level span")!.textContent = `Find ${STAGES[index].item.name}`;
      playCue("chapter");
    }),
  );
  untilShutdown(
    scene,
    events.on("stage-item", ({ state }) => {
      if (state === "collected") playCue("pickup");
    }),
  );
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
      if (!hand.length && !cooling) cooldownUntil = lastTime + SABOTEUR.fireCooldownMs;
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
        hint.textContent = "READY TO DROP";
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
    events.on("powerup", ({ kind, active }) => {
      if (active) activePowerups.add(kind);
      else activePowerups.delete(kind);
      hud.querySelector(".hud-powerups")!.textContent = [...activePowerups]
        .map((p) => powerupNames[p])
        .join(" · ");
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
      playCue(attackId === "fireball" ? "fireball" : "attack");
      announce(`${ATTACK_BY_ID.get(attackId)?.name ?? attackId} → ${LANES[lane]}`);
    }),
  );
  untilShutdown(
    scene,
    events.on("runner-hit", ({ effect }) => {
      if (activePowerups.has("shield")) {
        playCue("shield");
        announce("SHIELD BLOCKED THE HIT!", true);
        return;
      }
      playCue(effect === "slow" ? "slow" : "end");
      announce(effect === "slow" ? "JON SLOWED!" : "JON CAUGHT!");
    }),
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
    events.on("game-over", (result) => {
      stopMusic();
      if (result.outcome === "escaped") playCue("victory");
      scene.events.emit("shell-run-ended");
    }),
  );
}
