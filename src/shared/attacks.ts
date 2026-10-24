import type { Lane } from "./types";
import type { World } from "./world";

/** One saboteur attack card. Add a new attack = add one file in src/game/saboteur/attacks/. */
export interface AttackDef {
  id: string;
  name: string;
  /** Card color in the HUD. */
  color: number;
  fire(world: World, lane: Lane): void;
}
