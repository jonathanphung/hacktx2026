import { GIANT_WINDUP_MS } from "../../shared/combat";
export const SABOTEUR = {
  warningMs: GIANT_WINDUP_MS,
  fireCooldownMs: 3000,
  /** A fire this close to the cooldown ending is held and cast the moment it ends. */
  fireBufferMs: 300,
};
