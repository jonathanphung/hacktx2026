import type { InputEvent } from "../../shared/input";
import type { AiTactics, Difficulty, MatchSnapshot } from "../../shared/match";
import type { Lane } from "../../shared/types";

export const DIFFICULTY = {
  easy: { reactionMs: 480, mistake: 0.18, castWaitMs: 1000 },
  normal: { reactionMs: 300, mistake: 0.08, castWaitMs: 450 },
  hard: { reactionMs: 180, mistake: 0.025, castWaitMs: 120 },
} as const;

export function runnerDecision(
  snapshot: MatchSnapshot,
  tactics: AiTactics,
  difficulty: Difficulty,
  rng = Math.random,
): InputEvent | null {
  if (rng() < DIFFICULTY[difficulty].mistake) return null;
  const { runner, speed } = snapshot;
  const threats = snapshot.obstacles
    .map((o) => ({
      ...o,
      eta: (runner.y - o.y - o.height / 2 - 24) / Math.max(1, o.speed ?? speed),
    }))
    .filter((o) => o.eta > -0.15 && o.eta < 1.35);
  const imminent = threats.filter((o) => o.lane === runner.lane && o.eta < 0.5 && o.eta > -0.05);
  if (
    !runner.airborne &&
    imminent.length &&
    imminent.every((o) => o.jumpable) &&
    rng() < 0.65 + tactics.jumpPreference * 0.3
  )
    return { player: "runner", action: "jump" };
  const costs = ([0, 1, 2] as const)
    .map((lane) => {
      let cost = Math.abs(lane - runner.lane) * 4;
      for (const o of threats.filter((o) => o.lane === lane))
        cost += (o.lethal ? 100 : 30) / Math.max(0.2, o.eta + 0.2);
      if (snapshot.treasures.some((t) => t.lane === lane && t.y > -50 && t.y < runner.y + 40))
        cost -= 32;
      if (lane === tactics.preferredLane) cost -= 2;
      return { lane, cost };
    })
    .sort((a, b) => a.cost - b.cost);
  const target = costs[0].lane;
  return target === runner.lane
    ? null
    : { player: "runner", action: target < runner.lane ? "left" : "right" };
}

export function giantAim(snapshot: MatchSnapshot, tactics: AiTactics, previousLane: Lane): Lane {
  if (tactics.aim === "ambush")
    return snapshot.treasures.find((t) => t.y > 0)?.lane ?? tactics.preferredLane;
  if (tactics.aim === "predict")
    return Math.max(
      0,
      Math.min(2, snapshot.runner.lane + Math.sign(snapshot.runner.lane - previousLane)),
    ) as Lane;
  return snapshot.runner.lane;
}
