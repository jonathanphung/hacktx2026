import Phaser from "phaser";
import { Emitter } from "../shared/emitter";
import type { GameEvents } from "../shared/world";
import { installHud } from "../shell/hud";
import { installRunner } from "./runner";
import { installSaboteur } from "./saboteur";

/**
 * One game run. Owned by the runner lane, but kept tiny on purpose: each lane plugs in with a
 * single install call, so nobody needs to edit this file to add features.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super("game");
  }

  create() {
    const events = new Emitter<GameEvents>();
    const world = installRunner(this, events);
    installSaboteur(this, world);
    installHud(this, events);

    events.on("game-over", (result) => {
      this.time.delayedCall(800, () => this.scene.start("game-over", result));
    });
  }
}
