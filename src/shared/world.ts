import type Phaser from "phaser";
import type { Emitter } from "./emitter";
import type { Lane } from "./types";

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
  /** Spawns an obstacle at the top of the lane; it scrolls toward the runner. */
  spawnObstacle(spec: ObstacleSpec): void;
}

/** Runner powerups. Shield absorbs one hit; slowmo slows the track; double doubles score. */
export type PowerupKind = "shield" | "slowmo" | "double";

/** Events within one game run. A fresh emitter is created per run (see GameScene). */
export interface GameEvents {
  score: { score: number };
  "runner-hit": { kind: string; effect: ObstacleEffect };
  "game-over": { score: number; survivedMs: number };
  "hand-changed": { hand: readonly string[]; selected: number; aimLane: Lane };
  "attack-fired": { attackId: string; lane: Lane };
  /** Authoritative game state, separate from vision's acknowledgement of sent input. */
  "saboteur-status": {
    state: "ready" | "cooldown" | "empty" | "over";
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
