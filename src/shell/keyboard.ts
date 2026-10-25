import { inputBus, type InputEvent } from "../shared/input";

/**
 * Keyboard controls that produce the same events as gestures, so everyone can build and test
 * without a webcam. Runner: A / D / W. Saboteur: J / K / L aim, Enter drops the random obstacle.
 */
const KEYS: Record<string, InputEvent> = {
  KeyA: { player: "runner", action: "left" },
  KeyD: { player: "runner", action: "right" },
  KeyW: { player: "runner", action: "jump" },
  KeyJ: { player: "saboteur", action: "aim", lane: 0 },
  KeyK: { player: "saboteur", action: "aim", lane: 1 },
  KeyL: { player: "saboteur", action: "aim", lane: 2 },
  Enter: { player: "saboteur", action: "fire" },
};

export function installKeyboard(): void {
  window.addEventListener("keydown", (e) => {
    if (
      e.target instanceof HTMLElement &&
      (e.target.isContentEditable || e.target.closest("input, textarea, select, [contenteditable]"))
    )
      return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const event = KEYS[e.code];
    if (!event || e.repeat) return;
    e.preventDefault();
    inputBus.emit("input", { ...event, source: "keyboard" });
  });
}
