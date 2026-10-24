import Phaser from "phaser";
import { untilShutdown, type Emitter } from "../shared/emitter";
import { GAME_HEIGHT, GAME_WIDTH } from "../shared/types";
import type { GameEvents, PowerupKind } from "../shared/world";
import { ATTACK_BY_ID } from "../game/saboteur/attacks";

import { playCue } from "./audio";

const TEXT = { fontFamily: "system-ui, sans-serif", color: "#ffffff" };
const LANE_NAMES = ["LEFT", "CENTER", "RIGHT"];

/** Presentation only: subscribes to game events and never changes gameplay state. */
export function installHud(scene: Phaser.Scene, events: Emitter<GameEvents>): void {
  const label = (x: number, y: number, value: string, size = 16) =>
    scene.add.text(x, y, value, { ...TEXT, fontSize: `${size}px` }).setDepth(100);

  label(GAME_WIDTH / 2, 12, "SCORE", 13)
    .setOrigin(0.5, 0)
    .setColor("#a8b6d3");
  const score = label(GAME_WIDTH / 2, 30, "0", 36).setOrigin(0.5, 0);
  untilShutdown(
    scene,
    events.on("score", (e) => score.setText(String(e.score))),
  );

  label(20, GAME_HEIGHT - 90, "P1 / RUNNER", 20).setColor("#4fc3f7");
  label(20, GAME_HEIGHT - 58, "Swipe left / right · Swipe up to jump");
  label(20, GAME_HEIGHT - 34, "Keyboard: A / D / W", 14).setColor("#a8b6d3");

  const right = GAME_WIDTH - 20;
  const aim = label(right, GAME_HEIGHT - 150, "P2 / SABOTEUR · AIM: CENTER", 20)
    .setOrigin(1, 0)
    .setColor("#ff7575");
  const cards = scene.add.container(right, GAME_HEIGHT - 40).setDepth(100);
  const empty = label(right, GAME_HEIGHT - 86, "Cards appear here · Move your hand to aim", 16)
    .setOrigin(1, 0)
    .setColor("#a8b6d3");
  untilShutdown(
    scene,
    events.on("hand-changed", ({ hand, selected, aimLane }) => {
      aim.setText(`P2 / SABOTEUR · AIM: ${LANE_NAMES[aimLane]}`);
      cards.removeAll(true);
      empty.setVisible(hand.length === 0);
      empty.setText("Hand empty · Waiting for the next card…");
      hand.forEach((id, i) => {
        const attack = ATTACK_BY_ID.get(id);
        const x = -(hand.length - i) * 140;
        const active = i === selected;
        const card = scene.add
          .rectangle(x, 0, 130, 70, 0x202940)
          .setOrigin(0, 1)
          .setStrokeStyle(active ? 3 : 1, active ? 0xffffff : (attack?.color ?? 0x888888));
        const name = scene.add
          .text(x + 65, -48, attack?.name ?? id, { ...TEXT, fontSize: "16px" })
          .setOrigin(0.5);
        const selection = scene.add
          .text(x + 65, -21, active ? `${i + 1} · SELECTED` : `${i + 1} · SELECT`, {
            ...TEXT,
            fontSize: "12px",
            color: active ? "#4fc3f7" : "#a8b6d3",
          })
          .setOrigin(0.5);
        cards.add([card, name, selection]);
      });
    }),
  );
  label(right, GAME_HEIGHT - 24, "Aim J/K/L · Fist / Space: fire · 1–3: select", 14)
    .setOrigin(1, 0)
    .setColor("#a8b6d3");

  const activePowerups = new Set<PowerupKind>();
  const powerupNames: Record<PowerupKind, string> = {
    shield: "SHIELD",
    slowmo: "SLOW MOTION",
    double: "2× SCORE",
  };
  const powerupStatus = label(20, GAME_HEIGHT - 125, "", 16).setColor("#70e0b1");
  const feedback = label(GAME_WIDTH / 2, 98, "", 20)
    .setOrigin(0.5)
    .setAlpha(0);
  untilShutdown(
    scene,
    events.on("powerup", ({ kind, active }) => {
      if (active) activePowerups.add(kind);
      else activePowerups.delete(kind);
      powerupStatus.setText(
        [...activePowerups].map((powerup) => powerupNames[powerup]).join(" · "),
      );
      if (active) announce(`${powerupNames[kind]} ACTIVE`, "#70e0b1");
    }),
  );
  const announce = (message: string, color: string) => {
    scene.tweens.killTweensOf(feedback);
    feedback.setText(message).setColor(color).setAlpha(1);
    scene.tweens.add({ targets: feedback, alpha: 0, delay: 1000, duration: 250 });
  };
  untilShutdown(
    scene,
    events.on("attack-fired", ({ attackId, lane }) => {
      playCue("attack");
      announce(`${ATTACK_BY_ID.get(attackId)?.name ?? attackId} → ${LANE_NAMES[lane]}`, "#ffce85");
    }),
  );
  untilShutdown(
    scene,
    events.on("runner-hit", ({ effect }) => {
      if (activePowerups.has("shield")) {
        announce("SHIELD BLOCKED THE HIT!", "#70e0b1");
        return;
      }
      playCue(effect === "slow" ? "slow" : "end");
      announce(effect === "slow" ? "RUNNER SLOWED!" : "RUNNER CAUGHT!", "#ff7575");
    }),
  );
}
