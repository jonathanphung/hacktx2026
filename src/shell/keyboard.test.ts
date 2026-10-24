import { afterEach, describe, expect, it, vi } from "vitest";
import { inputBus } from "../shared/input";
import { installKeyboard } from "./keyboard";

describe("game keyboard shortcuts", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("leaves typing and editing shortcuts alone while preserving game controls", () => {
    let handler: (event: KeyboardEvent) => void = () => {};
    class Element {
      isContentEditable = false;
      constructor(private editable = false) {}
      closest() {
        return this.editable ? this : null;
      }
    }
    vi.stubGlobal("HTMLElement", Element);
    vi.stubGlobal("window", {
      addEventListener: (_: string, fn: typeof handler) => {
        handler = fn;
      },
    });
    const received = vi.fn();
    const off = inputBus.on("input", received);
    installKeyboard();
    const preventDefault = vi.fn();
    const key = (code: string, editable: boolean, modifiers = {}) =>
      handler({
        code,
        target: new Element(editable),
        preventDefault,
        ...modifiers,
      } as unknown as KeyboardEvent);
    try {
      for (const code of ["KeyH", "KeyA", "KeyC", "KeyK", "KeyT", "KeyX", "Space"]) key(code, true);
      expect(preventDefault).not.toHaveBeenCalled();
      expect(received).not.toHaveBeenCalled();
      key("KeyA", false, { ctrlKey: true });
      expect(received).not.toHaveBeenCalled();
      key("KeyA", false);
      expect(received).toHaveBeenCalledWith(
        expect.objectContaining({ player: "runner", action: "left" }),
      );
      key("KeyK", false);
      expect(received).toHaveBeenLastCalledWith(
        expect.objectContaining({ player: "saboteur", action: "aim", lane: 1 }),
      );
    } finally {
      off();
    }
  });
});
