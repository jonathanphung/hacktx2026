import { Emitter } from "./emitter";
import type { Lane } from "./types";

/**
 * Everything a player can do. Vision (gestures) and the keyboard both produce these;
 * game code only ever reads them, so it never knows or cares which one was used.
 */
export type InputEvent =
  | { player: "runner"; action: "left" | "right" | "jump" }
  | { player: "saboteur"; action: "aim"; lane: Lane }
  | { player: "saboteur"; action: "fire" }
  | { player: "saboteur"; action: "cycle" }
  | { player: "saboteur"; action: "select"; slot: number };

export type InputSource = "vision" | "keyboard" | "ai";

interface InputEvents {
  input: InputEvent & { source: InputSource };
}

/** App-wide input bus. Lives for the whole session (vision keeps running across scenes). */
export const inputBus = new Emitter<InputEvents>();
