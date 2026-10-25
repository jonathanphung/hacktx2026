import type { Lane, PlayerId } from "./types";

export type MatchMode = "duo" | "jon" | "giant";
export type Difficulty = "easy" | "normal" | "hard";
let settings: { mode: MatchMode; difficulty: Difficulty } = { mode: "duo", difficulty: "normal" };
export const getMatch = () => ({ ...settings });
export const setMatch = (mode: MatchMode, difficulty: Difficulty) => {
  settings = { mode, difficulty };
};
export const aiPlayer = (): PlayerId | null =>
  settings.mode === "jon" ? "saboteur" : settings.mode === "giant" ? "runner" : null;
export const acceptsPlayerInput = (player: PlayerId, source: string) =>
  aiPlayer() === player ? source === "ai" : source !== "ai";

export interface MatchSnapshot {
  runner: { lane: Lane; x: number; y: number; airborne: boolean };
  speed: number;
  stage: number;
  obstacles: { lane: Lane; y: number; height: number; jumpable: boolean; lethal: boolean }[];
  treasures: { lane: Lane; y: number }[];
}
export interface AiTactics {
  aim: "track" | "predict" | "ambush";
  preferredLane: Lane;
  aggression: number;
  jumpPreference: number;
}
export const DEFAULT_TACTICS: AiTactics = {
  aim: "track",
  preferredLane: 1,
  aggression: 0.6,
  jumpPreference: 0.5,
};
export const TACTICS_SCHEMA = {
  type: "object",
  properties: {
    aim: { type: "string", enum: ["track", "predict", "ambush"] },
    preferredLane: { type: "integer", minimum: 0, maximum: 2 },
    aggression: { type: "number", minimum: 0, maximum: 1 },
    jumpPreference: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["aim", "preferredLane", "aggression", "jumpPreference"],
  additionalProperties: false,
} as const;
export function parseTactics(value: unknown): AiTactics {
  if (!value || typeof value !== "object") throw new Error("Invalid tactics");
  const v = value as Record<string, unknown>;
  if (
    !["track", "predict", "ambush"].includes(String(v.aim)) ||
    ![0, 1, 2].includes(v.preferredLane as number)
  )
    throw new Error("Invalid tactics");
  for (const key of ["aggression", "jumpPreference"])
    if (
      typeof v[key] !== "number" ||
      !Number.isFinite(v[key]) ||
      (v[key] as number) < 0 ||
      (v[key] as number) > 1
    )
      throw new Error("Invalid tactics");
  return {
    aim: v.aim as AiTactics["aim"],
    preferredLane: v.preferredLane as Lane,
    aggression: v.aggression as number,
    jumpPreference: v.jumpPreference as number,
  };
}
