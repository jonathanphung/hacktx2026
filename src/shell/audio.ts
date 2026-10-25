import { MUSIC_THEMES, musicNotes } from "./music";
import { OBSTACLE_CUES, OBSTACLE_SOUNDS } from "./obstacle-sounds";
/** Short local chiptune cues; no audio downloads or external services. */
export type Cue =
  | keyof typeof OBSTACLE_SOUNDS
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
  notes: readonly number[];
  wave?: OscillatorType;
  step?: number;
  duration?: number;
  volume?: number;
  glide?: number;
}
const SOUNDS: Record<Cue, Sound> = {
  ...OBSTACLE_SOUNDS,
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
  fireball: {
    notes: [95, 170, 260, 110],
    wave: "sawtooth",
    volume: 0.07,
    duration: 0.23,
    step: 0.045,
    glide: 1.8,
  },
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
let volume = 0.8;
let rememberedVolume = volume;
let muted = false,
  installed = false;
const lastPlayed = new Map<Cue, number>();

let musicTimer: ReturnType<typeof setInterval> | undefined;
let musicWanted = false;
let musicPaused = false;
let nextBeat = 0;
let beat = 0;
let musicStage = 0;
let blend: { from: number; to: number; start: number } | undefined;
export function setMusicStage(stage: number): void {
  const next = Math.max(0, Math.min(5, Math.floor(stage)));
  if (next === musicStage) return;
  blend =
    musicWanted && context
      ? { from: musicStage, to: next, start: Math.max(nextBeat, context.currentTime + 0.04) }
      : undefined;
  musicStage = next;
}
export function playObstacle(kind: string): void {
  playCue(OBSTACLE_CUES[kind as keyof typeof OBSTACLE_CUES] ?? "attack");
}
const musicVoices = new Set<OscillatorNode>();
function scheduleMusic(): void {
  if (!musicWanted || musicPaused || !context || !output || context.state !== "running") return;
  nextBeat = Math.max(nextBeat, context.currentTime + 0.04);
  while (nextBeat < context.currentTime + 0.6) {
    const progress = blend ? Math.min(1, Math.max(0, (nextBeat - blend.start) / 2.4)) : 1;
    const layers =
      blend && progress < 1
        ? [
            { stage: blend.from, weight: 1 - progress },
            { stage: blend.to, weight: progress },
          ]
        : [{ stage: musicStage, weight: 1 }];
    for (const layer of layers) {
      if (layer.weight < 0.001) continue;
      for (const note of musicNotes(layer.stage, beat)) {
        const voice = context.createOscillator(),
          envelope = context.createGain();
        const start = nextBeat + (note.delay ?? 0);
        voice.type = note.wave;
        voice.frequency.setValueAtTime(440 * 2 ** ((note.midi - 69) / 12), start);
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(note.volume * layer.weight, start + 0.012);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
        voice.connect(envelope);
        envelope.connect(output);
        musicVoices.add(voice);
        voice.onended = () => {
          musicVoices.delete(voice);
          voice.disconnect();
          envelope.disconnect();
        };
        voice.start(start);
        voice.stop(start + note.duration + 0.01);
      }
    }
    const step = blend
      ? MUSIC_THEMES[blend.from].step * (1 - progress) + MUSIC_THEMES[blend.to].step * progress
      : MUSIC_THEMES[musicStage].step;
    if (progress === 1) blend = undefined;
    nextBeat += step;
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
  musicStage = 0;
  blend = undefined;
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

/** One persistent slider controls the whole mix; M restores the previous level. */
export function installShellAudio(): void {
  if (installed) return;
  installed = true;
  const wrapper = document.createElement("label");
  wrapper.id = "sound-toggle";
  wrapper.title = "Drag or scroll to adjust volume · M mutes";
  const caption = document.createElement("span");
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.setAttribute("aria-label", "Volume");
  const render = () => {
    muted = volume === 0;
    slider.value = String(Math.round(volume * 100));
    caption.textContent = `Volume ${slider.value}%`;
    slider.setAttribute("aria-valuetext", `${slider.value} percent`);
    if (context && output) output.gain.setValueAtTime(volume, context.currentTime);
  };
  const unlock = () => {
    try {
      if (!context) {
        context = new AudioContext();
        output = context.createGain();
        output.gain.value = volume;
        output.connect(context.destination);
      }
      if (context.state === "suspended") void context.resume().catch(() => {});
    } catch {
      /* Audio is optional on unsupported browsers. */
    }
  };
  const change = (value: number) => {
    volume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : volume));
    if (volume > 0) rememberedVolume = volume;
    render();
    unlock();
  };
  slider.addEventListener("input", () => change(Number(slider.value) / 100));
  slider.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      if (event.deltaY) change(volume + (event.deltaY < 0 ? 0.05 : -0.05));
    },
    { passive: false },
  );
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
      if (volume > 0) {
        rememberedVolume = volume;
        change(0);
      } else change(rememberedVolume || 0.8);
    },
    { capture: true },
  );
  render();
  wrapper.append(caption, slider);
  document.getElementById("stage")?.append(wrapper);
}
