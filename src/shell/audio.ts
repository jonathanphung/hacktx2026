/** Small synthesized cues: no downloads or venue Wi-Fi required. */
type Cue = "start" | "attack" | "slow" | "end";
const NOTES: Record<Cue, number[]> = {
  start: [440, 660, 880],
  attack: [330, 165],
  slow: [220, 180],
  end: [330, 247, 165],
};
let context: AudioContext | undefined;
let output: GainNode | undefined;
let muted = false;
let installed = false;

export function playCue(cue: Cue): void {
  if (muted || !context || !output) return;
  if (context.state === "suspended") {
    void context
      .resume()
      .then(() => {
        if (context?.state === "running") playCue(cue);
      })
      .catch(() => {});
    return;
  }
  if (context.state !== "running") return;
  const now = context.currentTime;
  NOTES[cue].forEach((frequency, i) => {
    const oscillator = context!.createOscillator();
    const envelope = context!.createGain();
    const start = now + i * 0.08;
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(0.12, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
    oscillator.connect(envelope);
    envelope.connect(output!);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + 0.13);
  });
}

/** Installed once; browser audio is unlocked only after a click or keypress. */
export function installShellAudio(): void {
  if (installed) return;
  installed = true;
  const button = document.createElement("button");
  button.id = "sound-toggle";
  button.type = "button";
  button.title = "Toggle sound (M)";
  const render = () => {
    button.textContent = muted ? "Sound: off" : "Sound: on";
    button.setAttribute("aria-label", muted ? "Enable sound" : "Mute sound");
    button.setAttribute("aria-pressed", String(muted));
    if (context && output) output.gain.setValueAtTime(muted ? 0 : 1, context.currentTime);
  };
  const unlock = () => {
    try {
      if (!context) {
        context = new AudioContext();
        output = context.createGain();
        output.gain.value = muted ? 0 : 1;
        output.connect(context.destination);
      }
      if (context.state === "suspended") void context.resume().catch(() => {});
    } catch {
      // Audio is optional; unsupported browsers can still play the game.
    }
  };
  button.addEventListener("click", () => {
    muted = !muted;
    render();
    unlock();
  });
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("keydown", (event) => {
    unlock();
    if (event.code !== "KeyM" || event.repeat || event.ctrlKey || event.metaKey || event.altKey)
      return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input, textarea, [contenteditable]")
    )
      return;
    muted = !muted;
    render();
  });
  render();
  document.getElementById("stage")?.append(button);
}
