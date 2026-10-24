import { inputBus, type InputEvent } from "../shared/input";

/**
 * Keyboard controls that produce the same events as gestures, so everyone can build and test
 * without a webcam. Runner: A / D / W. Saboteur: J / K / L aim, Space fires, 1-3 pick a card.
 */
const KEYS: Record<string, InputEvent> = {
  KeyA: { player: "runner", action: "left" },
  KeyD: { player: "runner", action: "right" },
  KeyW: { player: "runner", action: "jump" },
  KeyJ: { player: "saboteur", action: "aim", lane: 0 },
  KeyK: { player: "saboteur", action: "aim", lane: 1 },
  KeyL: { player: "saboteur", action: "aim", lane: 2 },
  Space: { player: "saboteur", action: "fire" },
  Digit1: { player: "saboteur", action: "select", slot: 0 },
  Digit2: { player: "saboteur", action: "select", slot: 1 },
  Digit3: { player: "saboteur", action: "select", slot: 2 },
};

export function installKeyboard(): void {
  window.addEventListener("keydown", (e) => {
    const event = KEYS[e.code];
    if (!event || e.repeat) return;
    e.preventDefault();
    inputBus.emit("input", { ...event, source: "keyboard" });
  });
}
