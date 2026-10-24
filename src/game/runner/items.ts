import { LANES, type Lane } from "../../shared/types";

/**
 * An item lane must have nothing in its top `clearPx`: anything lower is far enough ahead to
 * dodge and still get back in time. (330 px ≈ 0.9 s of warning at top speed.)
 */
export const ITEM_CLEAR_PX = 330;

/**
 * Picks a lane for the stage item where it can always be reached: no obstacle in that lane's
 * top `ITEM_CLEAR_PX`. Returns null when every lane is busy (try again shortly).
 */
export function pickItemLane(
  obstacles: readonly { lane: Lane; y: number }[],
  rng: () => number = Math.random,
): Lane | null {
  const open = LANES.filter(
    (lane) => !obstacles.some((o) => o.lane === lane && o.y < ITEM_CLEAR_PX),
  );
  return open.length ? open[Math.floor(rng() * open.length)] : null;
}
