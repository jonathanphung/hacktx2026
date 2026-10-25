const lerp = (a: number, b: number, t: number) =>
  Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));
export const STORY_BEAT_MS = 3300;
export const OPENING_BEATS = [
  {
    speaker: "JON",
    title: "A light in the woods",
    text: "Claude and I followed a strange glow. Then the clouds began to move.",
  },
  {
    speaker: "THE GIANT",
    title: "Taken to the tower",
    text: "A wizard’s companion? My highest cell has room for one more!",
  },
  {
    speaker: "CLAUDE",
    title: "Six clues. One way home.",
    text: "Jon! Follow the five tales. Find Xen’s last clue. Break the lock!",
  },
  { speaker: "JON", title: "The climb begins", text: "Hold on, Claude. I’m coming for you." },
] as const;
export const ENDING_BEATS = [
  {
    speaker: "CLAUDE",
    title: "The spell is broken",
    text: "You found every clue. I knew you’d come back.",
  },
  { speaker: "JON", title: "Together, down the beanstalk", text: "Stay close. We’re going home." },
  {
    speaker: "TOGETHER AGAIN",
    title: "No companion left behind",
    text: "Six small treasures opened the biggest door.",
  },
] as const;
/** Fixed camera, pixel-snapped actors. Movement is tied to the current narrative beat. */
export function storyPose(ending: boolean, elapsed: number) {
  const t = Math.max(0, elapsed) / STORY_BEAT_MS;
  if (ending)
    return {
      jon: {
        x: t < 1 ? 237 : t < 2 ? lerp(237, 180, t - 1) : lerp(180, 95, t - 2),
        y: t < 1 ? 88 : lerp(88, 132, t - 1),
      },
      claude: {
        x: t < 1 ? 274 : t < 2 ? lerp(274, 208, t - 1) : lerp(208, 125, t - 2),
        y: t < 1 ? 70 : lerp(70, 137, t - 1),
      },
      hand: { x: 274, y: -100 },
      bars: false,
      walking: t >= 1,
      climbing: t >= 1 && t < 2,
    };
  return {
    jon: {
      x: t < 3 ? 70 : lerp(70, 221, (t - 3) * 1.4),
      y: t < 3.7 ? 132 : lerp(132, 89, (t - 3.7) / 0.3),
    },
    claude: {
      x: t < 1.65 ? 105 : lerp(105, 274, (t - 1.65) / 0.8),
      y: t < 1.65 ? 137 : lerp(137, 70, (t - 1.65) / 0.8),
    },
    hand: {
      x: t < 1.65 ? 105 : lerp(105, 274, (t - 1.65) / 0.8),
      y:
        t < 1
          ? -100
          : t < 1.65
            ? lerp(-100, 108, (t - 1) / 0.65)
            : lerp(108, -100, (t - 1.65) / 0.8),
    },
    bars: t >= 2.45,
    walking: t >= 3 && t < 3.7,
    climbing: t >= 3.7,
  };
}
