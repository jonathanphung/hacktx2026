import { GIANT_WINDUP_MS } from "../../shared/combat";
export const SABOTEUR = {
  // Keep the fast projectile flight, but show a longer readable hand telegraph.
  warningMs: GIANT_WINDUP_MS + 200,
  castGapMs: 2000,
  fireCooldownMs: 3000,
  /** A fire this close to the cooldown ending is held and cast the moment it ends. */
  fireBufferMs: 300,
};
