import type { AttackDef } from "../../../shared/attacks";
import { barrier } from "./barrier";
import { hurdle } from "./hurdle";
import { oil } from "./oil";
import { doubleWall } from "./double-wall";
import { mud } from "./mud";
import { fireball } from "./fireball";

/** Every attack the deck can deal. Add new attacks to this list (one line each). */
export const ATTACKS: readonly AttackDef[] = [barrier, hurdle, oil, doubleWall, mud, fireball];

export const ATTACK_BY_ID = new Map(ATTACKS.map((a) => [a.id, a]));
