import Phaser from "phaser";
import { untilShutdown } from "../shared/emitter";
import { inputBus } from "../shared/input";
import { GAME_HEIGHT, GAME_WIDTH } from "../shared/types";

import { installShellAudio, playCue } from "./audio";

const TEXT = { fontFamily: "system-ui, sans-serif", color: "#ffffff", align: "center" };
const CYAN = 0x4fc3f7;
const CORAL = 0xff7575;

function backdrop(scene: Phaser.Scene) {
  scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x101426).setOrigin(0);
  for (let lane = 0; lane < 3; lane++) {
    scene.add.rectangle(470 + lane * 170, GAME_HEIGHT / 2, 166, GAME_HEIGHT, 0x192039, 0.5);
  }
}

function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number,
  color = "#ffffff",
) {
  return scene.add.text(x, y, value, { ...TEXT, fontSize: `${size}px`, color }).setOrigin(0.5);
}

/** All start methods share one guard and are removed when the scene shuts down. */
function installStart(scene: Phaser.Scene, button: Phaser.GameObjects.Text) {
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    playCue("start");
    scene.scene.start("game");
  };
  button.setInteractive({ useHandCursor: true }).on("pointerdown", go);
  button.on("pointerover", () => button.setAlpha(0.8));
  button.on("pointerout", () => button.setAlpha(1));
  const onEnter = (event: KeyboardEvent) => {
    event.preventDefault();
    go();
  };
  scene.input.keyboard?.on("keydown-ENTER", onEnter);
  untilShutdown(scene, () => scene.input.keyboard?.off("keydown-ENTER", onEnter));
  untilShutdown(
    scene,
    inputBus.on("input", (e) => {
      if (e.player === "runner" && e.action === "jump") go();
    }),
  );
}

function startButton(scene: Phaser.Scene, y: number, label: string) {
  return text(scene, GAME_WIDTH / 2, y, label, 24, "#101426")
    .setStyle({
      backgroundColor: "#4fc3f7",

      fontStyle: "bold",
    })
    .setPadding(36, 14);
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }

  create() {
    installShellAudio();
    backdrop(this);
    text(this, GAME_WIDTH / 2, 84, "ONE CAMERA. TWO PLAYERS.", 16, "#a8b6d3");
    text(this, GAME_WIDTH / 2, 142, "HACKTX RUNNER", 56);
    text(
      this,
      GAME_WIDTH / 2,
      200,
      "Outrun your friend. Or stop them in their tracks.",
      21,
      "#c0cbe0",
    );

    const players = [
      {
        x: 340,
        color: CYAN,
        title: "01 / RUNNER",
        side: "Stand on the LEFT",
        controls: "Swipe left / right to dodge\nSwipe up to jump",
        keys: "Keyboard: A / D / W",
      },
      {
        x: 940,
        color: CORAL,
        title: "02 / SABOTEUR",
        side: "Stand on the RIGHT",
        controls: "Move your hand to aim\nClose your fist to fire",
        keys: "Keyboard: J / K / L · Space to fire · 1–3 cards",
      },
    ];
    for (const player of players) {
      this.add.rectangle(player.x, 370, 550, 250, 0x202940).setStrokeStyle(1, player.color, 0.6);
      text(
        this,
        player.x,
        282,
        player.title,
        25,
        Phaser.Display.Color.IntegerToColor(player.color).rgba,
      );
      text(this, player.x, 324, player.side, 18, "#c0cbe0");
      text(this, player.x, 382, player.controls, 23).setLineSpacing(12);
      text(this, player.x, 460, player.keys, 16, "#a8b6d3");
    }
    const button = startButton(this, 556, "START RUN");
    text(this, GAME_WIDTH / 2, 618, "Click start, press Enter, or swipe up", 18, "#c0cbe0");
    text(
      this,
      GAME_WIDTH / 2,
      665,
      "Share one webcam. Keep one hand visible in your half of the picture.",
      16,
      "#a8b6d3",
    );
    installStart(this, button);
  }
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("game-over");
  }

  create(result: { score: number; survivedMs: number }) {
    installShellAudio();
    backdrop(this);
    text(this, GAME_WIDTH / 2, 190, "RUN ENDED", 18, "#a8b6d3");
    text(this, GAME_WIDTH / 2, 258, "SABOTEUR WINS!", 52, "#ff7575");
    text(this, 490, 362, String(result.score), 54);
    text(this, 490, 416, "SCORE", 16, "#a8b6d3");
    text(this, 790, 362, `${(result.survivedMs / 1000).toFixed(1)}s`, 54);
    text(this, 790, 416, "SURVIVED", 16, "#a8b6d3");
    const button = startButton(this, 516, "GET READY…").setAlpha(0.6);
    text(
      this,
      GAME_WIDTH / 2,
      584,
      "Click replay, press Enter, or swipe up for a rematch",
      18,
      "#c0cbe0",
    );
    // Ignore the gesture that ended the previous run.
    this.time.delayedCall(800, () => {
      button.setText("PLAY AGAIN").setAlpha(1);
      installStart(this, button);
    });
  }
}
