import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function audioFixture() {
  const tones: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const gains: {
    gain: {
      value: number;
      setValueAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
  }[] = [];
  class Button extends EventTarget {
    id = "";
    type = "";
    title = "";
    textContent = "";
    setAttribute = vi.fn();
    closest() {
      return null;
    }
  }
  const button = new Button(),
    window = new EventTarget(),
    append = vi.fn();
  class Context {
    state = "running";
    currentTime = 0;
    destination = {};
    resume = vi.fn(async () => {});
    createGain() {
      const node = {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gains.push(node);
      return node;
    }
    createOscillator() {
      const tone = {
        type: "triangle",
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
        onended: null as (() => void) | null,
        start: vi.fn(),
        stop: vi.fn(),
      };
      tones.push(tone);
      return tone;
    }
  }
  vi.stubGlobal("window", window);
  vi.stubGlobal("HTMLElement", Button);
  vi.stubGlobal("document", { createElement: () => button, getElementById: () => ({ append }) });
  vi.stubGlobal("AudioContext", Context);
  return { button, window, append, tones, gains };
}

describe("shell sound effects", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());
  it("unlocks from interaction and creates a short jump cue", async () => {
    const fixture = audioFixture();
    const { installShellAudio, playCue } = await import("./audio");
    installShellAudio();
    playCue("jump");
    expect(fixture.tones).toHaveLength(0);
    fixture.window.dispatchEvent(new Event("pointerdown"));
    playCue("jump");
    expect(fixture.tones).toHaveLength(3);
    expect(fixture.tones.every((t) => t.stop.mock.calls.length === 1)).toBe(true);
  });
  it("mute silences the master output and prevents new cues", async () => {
    const fixture = audioFixture();
    const { installShellAudio, playCue } = await import("./audio");
    installShellAudio();
    fixture.window.dispatchEvent(new Event("pointerdown"));
    playCue("pickup");
    fixture.button.dispatchEvent(new Event("click"));
    playCue("chapter");
    expect(fixture.tones).toHaveLength(3);
    expect(fixture.gains[0].gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    fixture.button.dispatchEvent(new Event("click"));
    playCue("chapter");
    expect(fixture.tones).toHaveLength(7);
  });
  it("installs once and rate-limits repeated identical cues", async () => {
    const fixture = audioFixture();
    const { installShellAudio, playCue } = await import("./audio");
    installShellAudio();
    installShellAudio();
    fixture.window.dispatchEvent(new Event("pointerdown"));
    playCue("dodge");
    playCue("dodge");
    expect(fixture.tones).toHaveLength(2);
    expect(fixture.append).toHaveBeenCalledOnce();
  });
});
