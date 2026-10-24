/** Short local chiptune cues; no audio downloads or external services. */
export type Cue =
  | "step"
  | "clue"
  | "relic"
  | "spawn"
  | "expire"
  | "aim"
  | "start"
  | "attack"
  | "fireball"
  | "slow"
  | "end"
  | "jump"
  | "dodge"
  | "pickup"
  | "shield"
  | "chapter"
  | "victory"
  | "jon"
  | "giant"
  | "ready"
  | "blocked"
  | "pause"
  | "resume";
interface Sound {
  notes: number[];
  wave?: OscillatorType;
  step?: number;
  duration?: number;
  volume?: number;
  glide?: number;
}
const SOUNDS: Record<Cue, Sound> = {
  step: { notes: [115], wave: "triangle", volume: 0.018, duration: 0.035, glide: 0.5 },
  clue: {
    notes: [523, 659, 784, 1046, 1318, 1568],
    wave: "triangle",
    volume: 0.085,
    step: 0.065,
    duration: 0.18,
  },
  relic: {
    notes: [1046, 1318, 1568, 2093],
    wave: "sine",
    volume: 0.045,
    step: 0.12,
    duration: 0.25,
  },
  spawn: { notes: [440, 880, 1320], wave: "sine", volume: 0.04, duration: 0.18 },
  expire: { notes: [660, 440, 330], wave: "triangle", volume: 0.035, duration: 0.08 },
  aim: { notes: [380], wave: "sine", volume: 0.025, duration: 0.035 },
  start: { notes: [440, 660, 880] },
  attack: { notes: [330, 165], glide: 0.7 },
  fireball: { notes: [180, 120, 75], wave: "sawtooth", volume: 0.04, duration: 0.18, glide: 0.45 },
  slow: { notes: [220, 180], glide: 0.7 },
  end: { notes: [330, 247, 165], duration: 0.18 },
  jump: {
    notes: [300, 480, 720],
    wave: "square",
    step: 0.035,
    duration: 0.08,
    volume: 0.04,
    glide: 1.2,
  },
  dodge: { notes: [420, 580], wave: "sine", step: 0.025, duration: 0.05, volume: 0.04 },
  pickup: { notes: [659, 988, 1318], volume: 0.07 },
  shield: { notes: [1100, 825, 1650], wave: "sine", volume: 0.07 },
  chapter: { notes: [392, 523, 659, 784], duration: 0.16 },
  victory: { notes: [523, 659, 784, 1046, 784, 1046], step: 0.11, duration: 0.2 },
  jon: { notes: [660, 880], wave: "sine", volume: 0.05 },
  giant: { notes: [98, 73], volume: 0.08, duration: 0.18 },
  ready: { notes: [880, 1320], wave: "sine", volume: 0.05 },
  blocked: { notes: [150, 120], wave: "square", volume: 0.025, duration: 0.05, step: 0.035 },
  pause: { notes: [392, 294], wave: "sine", volume: 0.05 },
  resume: { notes: [294, 392], wave: "sine", volume: 0.05 },
};
let context: AudioContext | undefined;
let output: GainNode | undefined;
let muted = false,
  installed = false;
const lastPlayed = new Map<Cue, number>();

let musicTimer: ReturnType<typeof setInterval> | undefined;
let musicWanted = false;
let musicPaused = false;
let nextBeat = 0;
let beat = 0;
let musicStage = 0;
export function setMusicStage(stage: number): void {
  musicStage = Math.max(0, Math.min(5, stage));
}
const musicVoices = new Set<OscillatorNode>();
// Original looping melody in A minor, with a soft root-note accompaniment.
const melody = [
  69, 72, 76, 72, 74, 71, 67, 71, 69, 72, 77, 76, 74, 72, 71, 67, 69, 76, 79, 76, 77, 74, 71, 74,
  72, 71, 69, 67, 64, 67, 71, 72,
];
function scheduleMusic(): void {
  if (!musicWanted || musicPaused || !context || !output || context.state !== "running") return;
  nextBeat = Math.max(nextBeat, context.currentTime + 0.04);
  while (nextBeat < context.currentTime + 0.6) {
    const notes = [melody[beat % melody.length]];
    if (beat % 2 === 0) notes.push([45, 43, 41, 40][Math.floor(beat / 8) % 4]);
    for (const note of notes) {
      const voice = context.createOscillator();
      const gain = context.createGain();
      voice.type = "triangle";
      voice.frequency.setValueAtTime(440 * 2 ** ((note - 69) / 12), nextBeat);
      gain.gain.setValueAtTime(0, nextBeat);
      gain.gain.linearRampToValueAtTime(note < 60 ? 0.05 : 0.038, nextBeat + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, nextBeat + 0.3);
      voice.connect(gain);
      gain.connect(output);
      musicVoices.add(voice);
      voice.onended = () => {
        musicVoices.delete(voice);
        voice.disconnect();
        gain.disconnect();
      };
      voice.start(nextBeat);
      voice.stop(nextBeat + 0.32);
    }
    // Synthesized kick, snare and hats give the loop a steady arcade groove.
    const drum = context.createOscillator(),
      envelope = context.createGain();
    const kick = beat % 4 === 0;
    const snare = beat % 4 === 2;
    const duration = kick ? 0.16 : snare ? 0.09 : 0.025;
    drum.type = kick ? "sine" : snare ? "triangle" : "square";
    drum.frequency.setValueAtTime(kick ? 130 : snare ? 240 : 5800, nextBeat);
    drum.frequency.exponentialRampToValueAtTime(kick ? 38 : snare ? 80 : 3800, nextBeat + duration);
    envelope.gain.setValueAtTime(kick ? 0.08 : snare ? 0.035 : 0.006, nextBeat);
    envelope.gain.exponentialRampToValueAtTime(0.001, nextBeat + duration);
    drum.connect(envelope);
    envelope.connect(output);
    musicVoices.add(drum);
    drum.onended = () => {
      musicVoices.delete(drum);
      drum.disconnect();
      envelope.disconnect();
    };
    drum.start(nextBeat);
    drum.stop(nextBeat + duration + 0.01);
    nextBeat += 0.26 - musicStage * 0.008;
    beat++;
  }
}
function clearMusic(): void {
  if (musicTimer !== undefined) clearInterval(musicTimer);
  musicTimer = undefined;
  for (const voice of musicVoices) {
    voice.stop();
    voice.disconnect();
  }
  musicVoices.clear();
  nextBeat = 0;
}
export function startMusic(): void {
  musicWanted = true;
  musicPaused = false;
  if (musicTimer === undefined) musicTimer = setInterval(scheduleMusic, 200);
  scheduleMusic();
}
export function stopMusic(): void {
  musicWanted = false;
  musicPaused = false;
  clearMusic();
  beat = 0;
}
export function pauseMusic(paused: boolean): void {
  musicPaused = paused;
  clearMusic();
  if (!paused && musicWanted) startMusic();
}

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
  if (now - (lastPlayed.get(cue) ?? -Infinity) < 0.07) return;
  lastPlayed.set(cue, now);
  const sound = SOUNDS[cue];
  sound.notes.forEach((frequency, i) => {
    const oscillator = context!.createOscillator(),
      envelope = context!.createGain();
    const start = now + i * (sound.step ?? 0.075),
      duration = sound.duration ?? 0.13;
    oscillator.type = sound.wave ?? "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    if (sound.glide)
      oscillator.frequency.exponentialRampToValueAtTime(frequency * sound.glide, start + duration);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(sound.volume ?? 0.075, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(output!);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  });
}

/** One persistent mute control; audio unlocks only following a user interaction. */
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
      /* Audio remains optional on unsupported browsers. */
    }
  };
  button.addEventListener("click", () => {
    muted = !muted;
    render();
    unlock();
  });
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener(
    "keydown",
    (event) => {
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
    },
    { capture: true },
  );
  render();
  document.getElementById("stage")?.append(button);
}
