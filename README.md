# Jon and the Beanstalk

**A two-player fairy-tale autoscroller you play with just your hands. Dodge traps as Jon or drop obstacles as the Giant.**

## Play

[**Play Jon and the Beanstalk in your browser**](https://www.jonandthebeanstalk.tech/)

Grab a friend, stand in front of one laptop webcam, and allow camera access. No extra controllers needed. The in-game tutorial walks you through the gestures.

| Role  | Position in the camera preview | Controls                                                              |
| ----- | ------------------------------ | --------------------------------------------------------------------- |
| Jon   | Left                           | Move your hand left or right to dodge; swipe up to jump.              |
| Giant | Right                          | Move your hand to aim at a lane; close your fist to drop an obstacle. |

Playing alone? Choose AI Jon or an AI Giant on Easy, Normal, or Hard difficulty.

No webcam? [Play with the keyboard](https://www.jonandthebeanstalk.tech/?novision): **A / D** to move Jon, **W** to jump, **J / K / L** to aim as the Giant, and **Enter** to drop an obstacle. **Esc** pauses the game.

## The story

The Giant has kidnapped Jon's companion, Claude, and locked him in a tower above the clouds. The lock has no key: its secret message is scattered across fairy tales.

Climb the beanstalk through Humpty Dumpty, Alice in Wonderland, Cinderella, King Triton, and Little Red Riding Hood, then face Xen, the tower's keeper. Collect each tale's treasure to uncover a clue and earn a new ability. Gather all six clues to free Claude and bring him home.

Or play the Giant and try to stop the rescue with walls, hurdles, oil, mud, and fireballs.

## Behind the game

Built for HackTX, our idea started with a simple goal: let two people play together on one laptop without extra controllers. A beanstalk gave us two natural roles: someone climbing and someone trying to knock them down.

We built the browser game with **TypeScript, Vite, and Phaser**, using **MediaPipe** to track both players' hands. **Muse Image** generated most of the artwork, which we animated in **Aseprite**. Sound is synthesized in the browser.

For single-player games, the **Gemini API** selects tactics from game-state summaries. Local controllers carry them out with reaction delays and normal cooldowns. Local opponents keep the game playable when the API is unavailable. Camera frames are not sent to Gemini.

Our biggest challenge was making imperfect hand tracking feel fair. We filtered unreliable readings, kept each player's inputs in their own half of the camera, and balanced attacks around gesture delay.
