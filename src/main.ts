import Phaser from "phaser";
import "./style.css";
import { GameScene } from "./game/GameScene";
import { GAME_HEIGHT, GAME_WIDTH } from "./shared/types";
import { installKeyboard } from "./shell/keyboard";
import { GameOverScene, TitleScene } from "./shell/scenes";
import { mountFacecamPreview, mountWebcamCorners, showBanner } from "./shell/webcam";
import { startVision } from "./vision";

installKeyboard();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#1b1b2f",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade" },
  scene: [TitleScene, GameScene, GameOverScene],
});

// Add ?novision to the URL to skip the camera and play with the keyboard only.
const params = new URLSearchParams(location.search);
if (params.has("facecam-preview")) {
  mountFacecamPreview();
} else if (!params.has("novision")) {
  startVision()
    .then(mountWebcamCorners)
    .catch((err) => {
      console.warn("[vision] unavailable, keyboard only", err);
      showBanner("Camera unavailable — keyboard controls only");
    });
}
