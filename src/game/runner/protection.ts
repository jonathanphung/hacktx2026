import type { PowerupState } from "./powerups";
import type { RelicPowers } from "./relics";

/** Pickup and relic shields are the same charge, never two consecutive blocks. */
export function absorbProtection(
  pickups: PowerupState,
  relics: RelicPowers,
  now: number,
): "pickup" | "ward" | null {
  const pickup = pickups.absorbHit(now);
  if (!pickup && !relics.wardReady(now)) return null;
  // A pickup block also restarts the ward's recharge, even if it was nearly ready.
  relics.spendWard(now);
  return pickup ? "pickup" : "ward";
}
