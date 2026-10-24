import Phaser from "phaser";
import type { Emitter } from "../shared/emitter";
import { GAME_HEIGHT, GAME_WIDTH } from "../shared/types";
import type { GameEvents } from "../shared/world";
import { ATTACK_BY_ID } from "../game/saboteur/attacks";

const TEXT = { fontFamily: "system-ui, sans-serif", color: "#ffffff" };

/** Score and the saboteur's hand of cards. Reads game events only; never changes game state. */
export function installHud(scene: Phaser.Scene, events: Emitter<GameEvents>): void {
  const score = scene.add
    .text(GAME_WIDTH / 2, 16, "0", { ...TEXT, fontSize: "36px" })
    .setOrigin(0.5, 0)
    .setDepth(100);
  events.on("score", (e) => score.setText(String(e.score)));

  scene.add
    .text(16, GAME_HEIGHT - 16, "P1 runner — swipe (A / D / W)", { ...TEXT, fontSize: "16px" })
    .setOrigin(0, 1)
    .setDepth(100);

  const cards = scene.add.container(GAME_WIDTH - 16, GAME_HEIGHT - 16).setDepth(100);
  events.on("hand-changed", ({ hand, selected }) => {
    cards.removeAll(true);
    hand.forEach((id, i) => {
      const attack = ATTACK_BY_ID.get(id);
      const x = -(hand.length - i) * 110;
      const card = scene.add
        .rectangle(x, 0, 100, 60, attack?.color ?? 0x888888)
        .setOrigin(0, 1)
        .setStrokeStyle(i === selected ? 4 : 0, 0xffffff);
      const label = scene.add
        .text(x + 50, -30, `${i + 1}. ${attack?.name ?? id}`, { ...TEXT, fontSize: "13px" })
        .setOrigin(0.5);
      cards.add([card, label]);
    });
  });

  scene.add
    .text(GAME_WIDTH - 16, GAME_HEIGHT - 84, "P2 saboteur — aim J/K/L, fire Space, pick 1-3", {
      ...TEXT,
      fontSize: "16px",
    })
    .setOrigin(1, 1)
    .setDepth(100);
}
