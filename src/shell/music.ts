export interface MusicNote {
  midi: number;
  wave: OscillatorType;
  volume: number;
  duration: number;
  delay?: number;
}
export const MUSIC_THEMES = [
  {
    name: "Humpty’s enchanted morning",
    step: 0.3,
    wave: "sine",
    tune: [72, 76, 79, 83, 79, 76, 74, 79, 76, 72, 67, 71, 74, 79, 76, 74],
    roots: [48, 53, 55, 48],
  },
  {
    name: "Alice’s curious music box",
    step: 0.275,
    wave: "triangle",
    tune: [74, 81, 77, 84, 76, 79, 83, 77, 86, 81, 79, 76, 84, 77, 81, 74],
    roots: [50, 55, 48, 57],
  },
  {
    name: "Cinderella’s midnight waltz",
    step: 0.25,
    wave: "sine",
    tune: [76, 79, 83, 88, 83, 79, 77, 81, 84, 89, 84, 81, 74, 79, 83, 86, 83, 79],
    roots: [45, 53, 55, 48],
  },
  {
    name: "Triton’s tidal hymn",
    step: 0.225,
    wave: "sine",
    tune: [69, 76, 81, 83, 81, 76, 72, 79, 84, 86, 84, 79, 71, 77, 81, 84],
    roots: [45, 48, 53, 55],
  },
  {
    name: "Red’s lantern-lit woods",
    step: 0.2,
    wave: "triangle",
    tune: [64, 71, 76, 79, 77, 76, 71, 67, 69, 76, 81, 79, 76, 72, 71, 64],
    roots: [40, 45, 53, 55],
  },
  {
    name: "Xen’s starlight tower",
    step: 0.18,
    wave: "sine",
    tune: [81, 84, 88, 91, 88, 84, 83, 86, 89, 93, 89, 86, 79, 83, 86, 91],
    roots: [45, 53, 48, 55],
  },
] as const;

/** Original celesta/harp phrases, warm sustained harmony, and restrained pulse. */
export function musicNotes(stage: number, beat: number): MusicNote[] {
  const theme = MUSIC_THEMES[stage];
  const root = theme.roots[Math.floor(beat / 8) % 4];
  const pitch = theme.tune[beat % theme.tune.length];
  const notes: MusicNote[] = [
    { midi: pitch, wave: theme.wave, volume: 0.045, duration: 0.65 },
    { midi: pitch + 12, wave: "sine", volume: 0.012, duration: 0.95 },
    { midi: pitch, wave: "sine", volume: 0.011, duration: 0.65, delay: theme.step * 0.75 },
  ];
  if (beat % 4 === 0) {
    notes.push({ midi: root, wave: "triangle", volume: 0.045, duration: 1 });
    for (const interval of [12, 19, 24])
      notes.push({ midi: root + interval, wave: "sine", volume: 0.009, duration: 1.5 });
  }
  if (stage >= 1)
    notes.push({
      midi: root + 36 + [0, 7, 12, 7][beat % 4],
      wave: "sine",
      volume: 0.012,
      duration: 0.35,
      delay: theme.step / 2,
    });
  if (beat % 4 === 2) notes.push({ midi: 43, wave: "sine", volume: 0.022, duration: 0.07 });
  if (stage >= 3)
    notes.push({
      midi: root + 24 + [0, 7, 12, 7][beat % 4],
      wave: "triangle",
      volume: 0.018,
      duration: 0.12,
      delay: theme.step / 2,
    });
  if (stage >= 4) notes.push({ midi: 98, wave: "triangle", volume: 0.007, duration: 0.025 });
  return notes;
}
