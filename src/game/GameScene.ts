import Phaser from "phaser";
import { Emitter } from "../shared/emitter";
import type { GameEvents } from "../shared/world";
import { installHud } from "../shell/hud";
import { installRunner } from "./runner";
import { preloadRunnerAssets } from "./runner/view";
import { installSaboteur } from "./saboteur";
import { installAi } from "./ai";

/**
 * One game run. Owned by the runner lane, but kept tiny on purpose: each lane plugs in with a
 * single install call, so nobody needs to edit this file to add features.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super("game");
  }

  preload() {
    preloadRunnerAssets(this);
  }

  create() {
    const events = new Emitter<GameEvents>();
    const world = installRunner(this, events);
    // HUD before saboteur: it must be listening when the saboteur announces its starting hand.
    installHud(this, events);
    installAi(this, world);
    installSaboteur(this, world);

    // Dev-only handle so agents/devtools can drive and inspect a run, e.g.
    // __game.world.spawnObstacle({ kind: "test", lane: 1, jumpable: false, effect: "end-run" })
    if (import.meta.env.DEV) {
      (window as unknown as { __game: unknown }).__game = { scene: this, world, events };
    }

    events.on("game-over", (result) => {
      this.time.delayedCall(800, () => this.scene.start("game-over", result));
    });
  }
}
