import type Phaser from "phaser";
import { Emitter } from "./emitter";
import type { StageId, StageItemId } from "./stages";
import type { Lane } from "./types";
import type { MatchSnapshot } from "./match";

/** Any positioned game object (Rectangle, Sprite, Container, ...). */
export type ObstacleView = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

/** What happens to the runner on contact. Add new effects here (it's a [contract] change). */
export type ObstacleEffect = "end-run" | "slow";

export interface ObstacleSpec {
  /** Free-form id for debugging/analytics, e.g. "barrier". */
  kind: string;
  lane: Lane;
  /** True if a jumping runner passes over it unharmed. */
  jumpable: boolean;
  effect: ObstacleEffect;
  /** Optional custom visuals. Default: a colored rectangle. Return an object positioned at (x, y). */
  createView?: (scene: Phaser.Scene, x: number, y: number) => ObstacleView;
  color?: number;
  width?: number;
  height?: number;
}

/** The runner lane's world, as other lanes see it. Implemented in src/game/runner. */
export interface World {
  readonly scene: Phaser.Scene;
  readonly events: Emitter<GameEvents>;
  /** Screen x of a lane's center. */
  laneX(lane: Lane): number;
  /** Current scroll speed in px/second. */
  readonly speed: number;
  /** Read-only observations for a single-player opponent. */
  snapshot?(): MatchSnapshot;
  /** Spawns an obstacle at the top of the lane; it scrolls toward the runner. */
  spawnObstacle(spec: ObstacleSpec): void;
}

/** Runner powerups. Shield absorbs one hit; slowmo slows the track; double doubles score. */
export type PowerupKind = "shield" | "slowmo" | "double";

/** Events within one game run. A fresh emitter is created per run (see GameScene). */
export interface GameEvents {
  "runner-action": { action: "left" | "right" | "jump" };
  /** `score` = points banked so far; `pot` = what the current tale is still worth (it drains). */
  score: { score: number; pot?: number };
  "runner-hit": { kind: string; effect: ObstacleEffect; blocked?: boolean; shieldBroken?: boolean };
  "obstacle-spawned": { kind: string; lane: Lane };
  /** `stage` = index into STAGES (src/shared/stages.ts) of the stage the run ended in. */
  "game-over": {
    score: number;
    survivedMs: number;
    stage?: number;
    outcome?: "caught" | "escaped";
  };
  /** The run entered a new stage (see src/shared/stages.ts). Not emitted for the first stage. */
  "stage-changed": { index: number; id: StageId; name: string };
  /**
   * The current stage's key item appeared on the track, was collected, or scrolled away.
   * Collecting it (outside the last stage) is what moves the run to the next stage.
   */
  "stage-item": {
    state: "spawned" | "collected" | "missed";
    stage: number;
    item: StageItemId;
    lane: Lane;
  };
  "hand-changed": { hand: readonly string[]; selected: number; aimLane: Lane };
  "attack-fired": { attackId: string; lane: Lane };
  /** Authoritative game state, separate from vision's acknowledgement of sent input. */
  "saboteur-status": {
    /** "queued": a cast was accepted and its warning is counting down; remainingMs = time to impact. */
    state: "ready" | "queued" | "cooldown" | "empty" | "over";
    remainingMs: number;
    aimLane: Lane;
  };
  "cast-result": {
    accepted: boolean;
    reason?: "cooldown" | "empty" | "starting" | "game-over";
    attackId?: string;
    lane: Lane;
    remainingMs: number;
  };
  /** A powerup was picked up (active: true) or ran out / was used up (active: false). */
  powerup: { kind: PowerupKind; active: boolean; durationMs: number };
}

/**
 * App-wide mirror of the saboteur's authoritative state. GameEvents is recreated per run, so
 * anything outside the scene (e.g. the webcam overlay) listens here instead.
 */
export const saboteurBus = new Emitter<Pick<GameEvents, "saboteur-status" | "cast-result">>();
