export type ChapterTheme = "grove" | "clouds" | "castle";
export type NaturalHazard = "wild-thorns" | "moss-rock" | "sticky-sap";
export interface StoryBeat {
  speaker: "Jon" | "Giant";
  title: string;
  text: string;
  scene: ChapterTheme;
}
export interface CampaignLevel {
  name: string;
  description: string;
  theme: ChapterTheme;
  durationSec: number;
  speedMultiplier: number;
  spawnIntervalMs: number;
  naturalHazards: 1 | 2;
  hazards: NaturalHazard[];
}
export interface Campaign {
  version: 1;
  title: string;
  intro: StoryBeat[];
  levels: CampaignLevel[];
  outro: string;
}

const themes = ["grove", "clouds", "castle"] as const;
const hazards = ["wild-thorns", "moss-rock", "sticky-sap"] as const;
const textSchema = (maxLength: number) => ({ type: "string", minLength: 1, maxLength });
const objectSchema = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
export const CAMPAIGN_SCHEMA = objectSchema({
  version: { type: "integer", enum: [1] },
  title: textSchema(70),
  intro: {
    type: "array",
    minItems: 3,
    maxItems: 3,
    items: objectSchema({
      speaker: { type: "string", enum: ["Jon", "Giant"] },
      title: textSchema(55),
      text: textSchema(200),
      scene: { type: "string", enum: themes },
    }),
  },
  levels: {
    type: "array",
    minItems: 3,
    maxItems: 3,
    items: objectSchema({
      name: textSchema(45),
      description: textSchema(140),
      theme: { type: "string", enum: themes },
      durationSec: { type: "integer", minimum: 20, maximum: 60 },
      speedMultiplier: { type: "number", minimum: 0.85, maximum: 1.2 },
      spawnIntervalMs: { type: "integer", minimum: 1800, maximum: 5500 },
      naturalHazards: { type: "integer", enum: [1, 2] },
      hazards: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        uniqueItems: true,
        items: { type: "string", enum: hazards },
      },
    }),
  },
  outro: textSchema(200),
});

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected an object");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error("Invalid story text");
  return value.trim();
}
function number(value: unknown, min: number, max: number, integer = false): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new Error("Difficulty setting is outside allowed bounds");
  return value;
}
function theme(value: unknown): ChapterTheme {
  if (!themes.includes(value as ChapterTheme)) throw new Error("Unknown chapter theme");
  return value as ChapterTheme;
}
/** Validate generated content again locally; model output never controls arbitrary code. */
export function parseCampaign(value: unknown): Campaign {
  const input = record(value);
  if (
    input.version !== 1 ||
    !Array.isArray(input.intro) ||
    input.intro.length !== 3 ||
    !Array.isArray(input.levels) ||
    input.levels.length !== 3
  )
    throw new Error("Expected version 1 with three story beats and three chapters");
  const intro = input.intro.map((raw, index) => {
    const beat = record(raw);
    const speaker: StoryBeat["speaker"] = index === 1 ? "Giant" : "Jon";
    if (beat.speaker !== speaker)
      throw new Error("Opening dialogue must alternate Jon, Giant, Jon");
    return {
      speaker,
      title: text(beat.title, 55),
      text: text(beat.text, 200),
      scene: theme(beat.scene),
    };
  });
  const levels = input.levels.map((raw) => {
    const level = record(raw);
    if (
      !Array.isArray(level.hazards) ||
      !level.hazards.length ||
      level.hazards.length > 3 ||
      !level.hazards.every((h) => hazards.includes(h as NaturalHazard)) ||
      new Set(level.hazards).size !== level.hazards.length
    )
      throw new Error("Invalid natural hazards");
    return {
      name: text(level.name, 45),
      description: text(level.description, 140),
      theme: theme(level.theme),
      durationSec: number(level.durationSec, 20, 60, true),
      speedMultiplier: number(level.speedMultiplier, 0.85, 1.2),
      spawnIntervalMs: number(level.spawnIntervalMs, 1800, 5500, true),
      naturalHazards: number(level.naturalHazards, 1, 2, true) as 1 | 2,
      hazards: [...level.hazards] as NaturalHazard[],
    };
  });
  if (levels[0].naturalHazards !== 1)
    throw new Error("The opening chapter must use single-obstacle waves");
  for (let i = 1; i < levels.length; i++) {
    if (
      levels[i].speedMultiplier < levels[i - 1].speedMultiplier ||
      levels[i].spawnIntervalMs > levels[i - 1].spawnIntervalMs ||
      levels[i].naturalHazards < levels[i - 1].naturalHazards
    )
      throw new Error("Chapter difficulty must progress gradually");
  }
  return { version: 1, title: text(input.title, 70), intro, levels, outro: text(input.outro, 200) };
}

/** Authored fallback, not claimed to be generated by Gemini. */
export const DEFAULT_CAMPAIGN: Campaign = {
  version: 1,
  title: "The Stolen Starlight",
  intro: [
    {
      speaker: "Jon",
      title: "A wish in the woods",
      text: "Giant! The valley has gone dark. I have come to return the starlight to everyone below.",
      scene: "grove",
    },
    {
      speaker: "Giant",
      title: "One enchanted seed",
      text: "Then climb, little wizard! My vines are wild, my stones are heavy, and my fire will send you tumbling home.",
      scene: "clouds",
    },
    {
      speaker: "Jon",
      title: "The Giant awakens",
      text: "I have my staff, my courage, and a very good pair of boots. Keep your eyes on the beanstalk!",
      scene: "castle",
    },
  ],
  levels: [
    {
      name: "Whispering Grove",
      description: "Learn the rhythm of the living vines.",
      theme: "grove",
      durationSec: 30,
      speedMultiplier: 0.9,
      spawnIntervalMs: 4500,
      naturalHazards: 1,
      hazards: ["wild-thorns", "sticky-sap"],
    },
    {
      name: "Cloudbound Crossing",
      description: "Mossy stones guard the path above the clouds.",
      theme: "clouds",
      durationSec: 35,
      speedMultiplier: 1,
      spawnIntervalMs: 3100,
      naturalHazards: 1,
      hazards: ["wild-thorns", "moss-rock", "sticky-sap"],
    },
    {
      name: "The Starkeeper's Gate",
      description: "Find the open vine and reclaim the starlight.",
      theme: "castle",
      durationSec: 40,
      speedMultiplier: 1.1,
      spawnIntervalMs: 2200,
      naturalHazards: 2,
      hazards: ["wild-thorns", "moss-rock"],
    },
  ],
  outro:
    "Jon raised his staff. The stolen stars returned to the night, and the beanstalk bloomed with a thousand tiny lights.",
};
let current = DEFAULT_CAMPAIGN;
export function setCampaign(value: unknown): Campaign {
  current = parseCampaign(value);
  return current;
}
export function getCampaign(): Campaign {
  return current;
}
export function campaignLevelAt(elapsedSeconds: number, campaign: Campaign = current) {
  let remaining = Math.max(0, elapsedSeconds);
  for (let index = 0; index < campaign.levels.length; index++) {
    const level = campaign.levels[index];
    if (remaining < level.durationSec)
      return { level, index, remainingSec: level.durationSec - remaining, complete: false };
    remaining -= level.durationSec;
  }
  return {
    level: campaign.levels[campaign.levels.length - 1],
    index: campaign.levels.length - 1,
    remainingSec: 0,
    complete: true,
  };
}
