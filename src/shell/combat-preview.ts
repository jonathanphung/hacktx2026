import type Phaser from "phaser";
import type { World } from "../shared/world";
import { mountShell } from "./presentation";
import { ATTACK_BY_ID } from "../game/saboteur/attacks";
import { createGiantHand } from "../game/saboteur/giant-hand";
import { GIANT_WINDUP_MS } from "../shared/combat";

/** Local review controls use real spawns and pickups. This installer is stripped from production. */
export function installCombatPreview(scene: Phaser.Scene, world: World) {
  const panel = mountShell(scene, "combat-preview");
  panel.innerHTML = `<strong>COMBAT PLAYTEST · UNLIMITED TRIES</strong><span>Hands or A/D/W to move. Pickups appear on your current stem.</span><div><button data-attack="fireball">Launch fireball</button><button data-attack="hurdle">Roll log</button><button data-attack="barrier">Place wall</button><button data-pickup="blast">✹ Blast pickup</button><button data-pickup="giant-slow">◷ Giant Slow pickup</button><button data-pickup="slowmo">⌛ Time Slow pickup</button></div>`;
  let busy = false;
  panel.querySelectorAll<HTMLButtonElement>("[data-attack]").forEach((button) =>
    button.addEventListener("click", () => {
      if (busy || scene.sys.isPaused()) return;
      busy = true;
      const attack = ATTACK_BY_ID.get(button.dataset.attack!)!;
      const target = world.snapshot?.().runner.lane ?? 1;
      const hand = createGiantHand(
        scene,
        world.laneX(target),
        attack.color,
        GIANT_WINDUP_MS,
        attack.id,
      );
      scene.time.delayedCall(GIANT_WINDUP_MS, () => {
        hand.release();
        attack.fire(world, target);
        busy = false;
      });
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>("[data-pickup]").forEach((button) =>
    button.addEventListener("click", () => {
      if (!scene.sys.isPaused()) scene.events.emit("dev-pickup", button.dataset.pickup);
    }),
  );
}
