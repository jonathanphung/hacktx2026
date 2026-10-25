import type Phaser from "phaser";
import { untilShutdown } from "../../shared/emitter";
import { inputBus } from "../../shared/input";
import {
  aiPlayer,
  DEFAULT_TACTICS,
  getMatch,
  parseTactics,
  type MatchSnapshot,
} from "../../shared/match";
import type { World, GameEvents } from "../../shared/world";
import type { Lane } from "../../shared/types";
import { DIFFICULTY, giantAim, runnerDecision } from "./decisions";
import { mountShell } from "../../shell/presentation";

export function installAi(scene: Phaser.Scene, world: World): void {
  const role = aiPlayer();
  if (!role || !world.snapshot) return;
  const { difficulty } = getMatch(),
    profile = DIFFICULTY[difficulty];
  const badge = mountShell(scene, "ai-status");
  badge.textContent = `AI ${role === "runner" ? "Jon" : "Giant"} · ${difficulty} · connecting`;
  let tactics = { ...DEFAULT_TACTICS },
    nextThink = -1,
    nextRequest = -1,
    ended = false,
    pending = false;
  let frameNow = -1,
    readyAt = -1;
  let ready = false,
    previousLane: Lane = 1,
    lastCast = -Infinity,
    lastJump = -Infinity;
  let controller: AbortController | undefined;
  const session = crypto.randomUUID();
  const history: { at: number; state: MatchSnapshot }[] = [];
  untilShutdown(
    scene,
    world.events.on("saboteur-status", ({ state }: GameEvents["saboteur-status"]) => {
      if (state === "ready" && !ready) readyAt = frameNow;
      ready = state === "ready";
    }),
  );
  const stop = () => {
    ended = true;
    controller?.abort();
  };
  untilShutdown(scene, world.events.on("game-over", stop));
  untilShutdown(scene, stop);
  const refresh = async (snapshot: MatchSnapshot) => {
    pending = true;
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 6500);
    try {
      const response = await fetch(import.meta.env.VITE_AI_ENDPOINT || "/api/ai/tactics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          role,
          difficulty,
          session,
          snapshot: {
            ...snapshot,
            obstacles: snapshot.obstacles.slice(0, 24),
            treasures: snapshot.treasures.slice(0, 12),
          },
        }),
      });
      if (!response.ok) throw new Error("Unavailable");
      const plan = parseTactics(await response.json());
      if (!ended) {
        tactics = plan;
        badge.textContent = `Gemini ${role === "runner" ? "Jon" : "Giant"} · ${difficulty}`;
      }
    } catch {
      if (!ended)
        badge.textContent = `AI ${role === "runner" ? "Jon" : "Giant"} · ${difficulty} · offline tactics`;
    } finally {
      clearTimeout(timeout);
      pending = false;
    }
  };
  const update = (now: number) => {
    if (ended || scene.sys.isPaused()) return;
    frameNow = now;
    if (ready && readyAt < 0) readyAt = now;
    const state = world.snapshot!();
    history.push({ at: now, state });
    while (history.length > 2 && history[1].at <= now - profile.reactionMs) history.shift();
    if (nextRequest < 0 || now >= nextRequest) {
      if (!pending) {
        nextRequest = now + 10_000;
        void refresh(state);
      }
    }
    if (now < nextThink || history[0].at > now - profile.reactionMs) return;
    nextThink = now + profile.reactionMs;
    const observed = history[0].state;
    if (role === "runner") {
      const action = runnerDecision(observed, tactics, difficulty);
      if (action?.action === "jump") {
        if (now - lastJump < 850) return;
        lastJump = now;
      }
      if (action) inputBus.emit("input", { ...action, source: "ai" });
    } else {
      const target = giantAim(observed, tactics, previousLane);
      previousLane = observed.runner.lane;
      inputBus.emit("input", { player: "saboteur", action: "aim", lane: target, source: "ai" });
      if (
        ready &&
        now - readyAt >= profile.castWaitMs + (1 - tactics.aggression) * 1200 &&
        now - lastCast >= 1700 &&
        Math.random() >= profile.mistake
      ) {
        inputBus.emit("input", { player: "saboteur", action: "fire", source: "ai" });
        lastCast = now;
      }
    }
  };
  scene.events.on("update", update);
  untilShutdown(scene, () => scene.events.off("update", update));
}
