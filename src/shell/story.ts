import { pixelTowerArt } from "./pixel-story";
import { STAGES, STORY_LETTERS } from "../shared/stages";

export interface StoryBeat {
  speaker: string;
  title: string;
  text: string;
  art: number;
  collected: number;
}
export const REWARDS = [
  ["Feather Step", "Jumps last 10% longer."],
  ["Curious Reach", "Collect treasures and pickups from 18px farther away."],
  ["Glass Resolve", "Slow effects wear off 25% sooner."],
  ["Tidal Ward", "Absorb one hit. Recharges every 35 seconds."],
  ["Brave Heart", "Tale points drain 15% slower."],
  ["Last Clue", "The final piece of the cell’s message is revealed."],
] as const;
export const PROLOGUE: readonly StoryBeat[] = [
  {
    speaker: "JON",
    title: "Claude is gone",
    text: "Claude’s scarf was caught on the beanstalk. My companion would never leave it behind. Above the clouds, a tower window glows—and someone is calling my name.",
    art: 6,
    collected: 0,
  },
  {
    speaker: "THE GIANT",
    title: "A lock with no key",
    text: "Your little friend is in my highest cell. The door answers to a message, and I scattered its pieces through five tales. My keeper Xen holds the last. Climb if you dare!",
    art: 6,
    collected: 0,
  },
  {
    speaker: "JON",
    title: "Hold on, Claude",
    text: "I’ll gather every treasure and uncover the message, one piece at a time. Humpty’s wall is first. Whatever waits up there, I’m not leaving without you.",
    art: 0,
    collected: 0,
  },
];
export const TALE_SCENES: readonly StoryBeat[] = [
  {
    speaker: "HUMPTY DUMPTY",
    title: "A crack in the mystery",
    text: "The giant hid something inside my egg. Look: H, the first mark on the lock! Take my feather step. Alice saw where he went next.",
    art: 0,
    collected: 1,
  },
  {
    speaker: "ALICE",
    title: "A message in a bottle",
    text: "My potion reveals hidden ink. There—A, your second piece! Keep them in the order you find them. Cinderella has another clue, if you can reach her before midnight.",
    art: 1,
    collected: 2,
  },
  {
    speaker: "CINDERELLA",
    title: "The midnight inscription",
    text: "There’s a C etched into the glass. Claude helped me hide this slipper from the giant. Return the kindness, Jon. King Triton knows the path beyond the clouds.",
    art: 2,
    collected: 3,
  },
  {
    speaker: "KING TRITON",
    title: "A secret beneath the tide",
    text: "My trident carries K. Four pieces found. Take a tidal ward for the climb ahead. Red heard Claude’s voice in the dark woods—he hasn’t given up on you.",
    art: 3,
    collected: 4,
  },
  {
    speaker: "LITTLE RED RIDING HOOD",
    title: "Follow the red thread",
    text: "I stitched T into my hood so the giant wouldn’t find it. Five pieces! Xen guards the last one at the tower’s roots. Keep going. Your friend is waiting.",
    art: 4,
    collected: 5,
  },
];
export const FINALE: readonly StoryBeat[] = [
  {
    speaker: "CLAUDE",
    title: "You came back for me",
    text: "I knew that was your staff outside the window! I counted every spark on the beanstalk. You found the message… you actually found it!",
    art: 7,
    collected: 6,
  },
  {
    speaker: "JON",
    title: "No companion left behind",
    text: "Eggshell, potion, glass, tide, thread, and a keeper’s badge. Six little things opened the biggest door. Come on, Claude. We’re going home.",
    art: 7,
    collected: 6,
  },
];
export const letterMarkup = (count: number) =>
  [...STORY_LETTERS]
    .map(
      (letter, i) =>
        `<span class="spell-letter${i < count ? " restored" : ""}" aria-label="${i < count ? letter : "Unknown piece"}">${i < count ? letter : "?"}</span>`,
    )
    .join("");
export const taleLabel = (index: number) => STAGES[index].name;
export const acceptsMessage = (value: string) => value.trim().toUpperCase() === STORY_LETTERS;

export const towerArt = pixelTowerArt;

const objects = [
  `<path d="M230 215v-50h340v50" fill="#9b6580"/><path d="M230 190h340m-270-25v25m110-25v25m110-25v25m-160 0v25m110-25v25" stroke="#dba6a3" stroke-width="3"/><ellipse cx="400" cy="122" rx="37" ry="49" fill="#fff1d5"/><path d="m385 111 9-8m15 8 9-8m-32 32q14 14 28-2" fill="none" stroke="#724754" stroke-width="4"/>`,
  `<g fill="#d589c1"><path d="M170 205q45-130 90 0zm370 0q45-130 90 0z"/></g><path d="M384 85v27q-47 26-36 67 52 28 104 0 11-41-36-67V85" fill="#b3f4eb" stroke="#e1fff8" stroke-width="5"/><path d="M355 149q45 17 90 0v25q-45 22-90 0z" fill="#a583ee"/><path d="M381 76h38v16h-38z" fill="#c4926a"/>`,
  `<circle cx="580" cy="70" r="36" fill="#fff5d7"/><path d="M580 45v25l16 8" fill="none" stroke="#8876ab" stroke-width="4"/><path d="M300 174q40-12 53-80l35 46q15 27 83 29l18 16q-89 21-127-4l-17 21h-22v-32" fill="#bde9ff" stroke="#f1faff" stroke-width="4"/>`,
  `<path d="M120 180q100-35 200 0t200 0 200 0v70H120" fill="#5dbcb8" opacity=".5"/><path d="M385 205V75m-50 0v45q0 25 50 25t50-25V75" fill="none" stroke="#ffdc85" stroke-width="13"/><path d="m322 84 13-30 13 30m24-9 13-31 13 31m24 9 13-30 13 30" fill="#fff0b6"/>`,
  `<g fill="#233e47"><path d="m150 220 35-150 35 150zm430 0 35-170 35 170z"/></g><path d="m360 203 40-110 40 110z" fill="#dc607c" stroke="#ffb1b1" stroke-width="4"/><path d="M369 123q-8-57 31-58t31 58l-31-18z" fill="#e97788" stroke="#ffb1b1" stroke-width="4"/>`,
  `<path d="m374 85-25-48m77 48 25-48" stroke="#a1ece9" stroke-width="10"/><rect x="342" y="74" width="116" height="137" rx="15" fill="#59368b" stroke="#ffe5a1" stroke-width="6"/><path d="m375 106 50 57m0-57-50 57" stroke="#fff1bb" stroke-width="12"/><text x="400" y="192" text-anchor="middle" font-size="16" fill="#ffe5a1" letter-spacing="3">KEEPER</text>`,
];
const skies = ["#d79b9f", "#7960ac", "#4d589c", "#217a94", "#4b546e", "#684297"];
export function taleArt(index: number): string {
  if (index >= 6) return towerArt(index === 7);
  return `<svg viewBox="0 0 800 260" aria-hidden="true"><rect width="800" height="260" fill="${skies[index]}"/><circle cx="128" cy="60" r="52" fill="#fff4d4" opacity=".18"/><path d="M0 225Q150 170 300 225T600 225T900 225V260H0" fill="#272646" opacity=".45"/><g class="story-clouds" fill="#fff2eb" opacity=".25"><ellipse cx="170" cy="105" rx="100" ry="20"/><ellipse cx="660" cy="145" rx="120" ry="24"/></g><g class="story-jon" transform="translate(150 185)"><path d="m0-55-28 65h56z" fill="#9e7bce"/><circle cy="-57" r="12" fill="#efc79f"/><path d="m0-106-24 43h48z" fill="#66448c"/><path d="m-32-62h64" stroke="#d4b1ea" stroke-width="6"/><path d="m34 12 5-76" stroke="#d6ac6d" stroke-width="5"/><circle cx="39" cy="-68" r="8" fill="#b5ffdf"/></g><g class="story-giant" transform="translate(650 162)"><path d="M-45 55v-45q45-40 90 0v45" fill="#62427b"/><ellipse cy="-20" rx="34" ry="38" fill="#c19472"/><path d="m-32-36 5-26h54l5 26" fill="#49304e"/><path d="m-18-21 10-3m8 0 12 3m-21 24q11 8 22 0" fill="none" stroke="#614254" stroke-width="4"/><path d="m-45 15-20 30m110-30 20 30" stroke="#c19472" stroke-width="13"/></g><g class="story-relic">${objects[index]}</g><g class="story-sparks" fill="#fff3b0"><path d="m270 64 4 12 12 4-12 4-4 12-4-12-12-4 12-4zm250 35 4 12 12 4-12 4-4 12-4-12-12-4 12-4z"/><circle cx="310" cy="138" r="3"/><circle cx="486" cy="182" r="4"/></g><path d="M40 260Q100 160 40 10M760 260Q700 160 760 10" fill="none" stroke="#9dbb83" stroke-width="10"/></svg>`;
}
