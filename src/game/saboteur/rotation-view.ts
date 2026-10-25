import type Phaser from "phaser";
import { mountShell } from "../../shell/presentation";
import { ATTACK_BY_ID } from "./attacks";

/** Read-only forecast: stocked cards first, then the exact future rotation draws. */
export function createRotationPreview(scene: Phaser.Scene) {
  const ui = mountShell(scene, "giant-rotation");
  document.querySelector(".story-hud .run-right")?.append(ui);
  ui.innerHTML = `<h3>GIANT · NEXT DROP</h3><ol></ol><p>Fist to drop · The order repeats</p>`;
  const list = ui.querySelector("ol")!;
  let last = "";
  return (stock: readonly string[], upcoming: readonly string[]) => {
    const ids = [...stock, ...upcoming].slice(0, 1);
    const key = JSON.stringify([stock.length, ids]);
    if (last === key) return;
    last = key;
    list.replaceChildren();
    ids.forEach((id, i) => {
      const attack = ATTACK_BY_ID.get(id)!;
      const card = document.createElement("li");
      card.style.setProperty("--attack-color", `#${attack.color.toString(16).padStart(6, "0")}`);
      const number = document.createElement("b");
      number.textContent = String(i + 1);
      const name = document.createElement("strong");
      name.textContent = attack.name;
      const tag = document.createElement("small");
      tag.textContent =
        i < stock.length
          ? i === 0
            ? "NEXT · IN STOCK"
            : "IN STOCK"
          : i === 0
            ? "RECHARGING"
            : "ON DECK";
      card.append(number, name, tag);
      list.append(card);
    });
  };
}
