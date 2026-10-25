import type Phaser from "phaser";
import { untilShutdown } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import type { Lane } from "../../shared/types";
import type { World } from "../../shared/world";
import { mountShell } from "../../shell/presentation";
import { createGiantHand } from "./giant-hand";
import { FeintState, FEINT_WINDUP_MS } from "./feint-state";

/** Optional bluff: never calls spawnObstacle, consumes stock or changes normal fist controls. */
export function installGiantFeint(scene: Phaser.Scene, world: World) {
  const state = new FeintState();
  const ui = mountShell(scene, "giant-feint");
  ui.innerHTML = `<button type="button" disabled>FEINT · F</button><span>Fake a drop. Bait a dodge. Recharges in 8s.</span>`;
  const button = ui.querySelector("button")!;
  let now = -1,
    lane: Lane = 1,
    over = false;
  let hand: ReturnType<typeof createGiantHand> | null = null;
  const feint = () => {
    if (over || scene.sys.isPaused() || !state.start(now)) return;
    hand = createGiantHand(scene, world.laneX(lane), 0xff5252, FEINT_WINDUP_MS, "barrier");
    button.disabled = true;
  };
  button.addEventListener("click", feint);
  const key = (event: KeyboardEvent) => {
    if (event.code !== "KeyF" || event.repeat || event.ctrlKey || event.metaKey || event.altKey)
      return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input, textarea, select, [contenteditable]")
    )
      return;
    event.preventDefault();
    feint();
  };
  window.addEventListener("keydown", key);
  untilShutdown(scene, () => window.removeEventListener("keydown", key));
  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (e.player === "saboteur" && e.action === "aim" && !scene.sys.isPaused()) lane = e.lane;
    }),
  );
  untilShutdown(
    scene,
    world.events.on("game-over", () => {
      over = true;
      button.disabled = true;
      hand?.destroy();
      hand = null;
    }),
  );
  const update = (time: number) => {
    now = time;
    if (over) return;
    if (state.finish(time)) {
      hand?.destroy();
      hand = null;
    }
    const remaining = state.remaining(time);
    button.disabled = remaining > 0;
    button.textContent =
      remaining > 0 ? `FEINT · ${(remaining / 1000).toFixed(1)}s` : "FEINT READY · F";
  };
  scene.events.on("update", update);
  untilShutdown(scene, () => {
    scene.events.off("update", update);
    hand?.destroy();
  });
}
