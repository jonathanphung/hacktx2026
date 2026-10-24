import Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { inputBus } from "../shared/input";
import { GAME_HEIGHT, GAME_WIDTH } from "../shared/types";

const TEXT = { fontFamily: "system-ui, sans-serif", color: "#ffffff", align: "center" };

/** Start on Enter, or when the runner jumps (so players can start with a gesture). */
function startOnEnterOrJump(scene: Phaser.Scene, next: string) {
  const go = () => scene.scene.start(next);
  scene.input.keyboard?.once("keydown-ENTER", go);
  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (e.player === "runner" && e.action === "jump") go();
    }),
  );
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }

  create() {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, "HACKTX RUNNER", { ...TEXT, fontSize: "64px" })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, "Runner: swipe up (or press Enter) to start", {
        ...TEXT,
        fontSize: "24px",
      })
      .setOrigin(0.5);
    startOnEnterOrJump(this, "game");
  }
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("game-over");
  }

  create(result: { score: number; survivedMs: number }) {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, `Saboteur wins!\nScore ${result.score}`, {
        ...TEXT,
        fontSize: "48px",
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, "Swipe up or press Enter to play again", {
        ...TEXT,
        fontSize: "22px",
      })
      .setOrigin(0.5);
    // Short delay so the gesture that ended the run doesn't instantly restart it.
    this.time.delayedCall(800, () => startOnEnterOrJump(this, "game"));
  }
}
