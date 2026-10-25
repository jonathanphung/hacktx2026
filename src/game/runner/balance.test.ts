import { expect, it } from "vitest";
import { HazardMotion, crossesRunner } from "./active-hazards";
import { GIANT_RELEASE_Y } from "../../shared/combat";
import { SABOTEUR } from "../saboteur/config";
import { GIANT_ROTATION } from "../saboteur/rotation";
import { SCORE } from "./score";

it("retains at least 1.2s combined warning for fast attacks across levels, frame rates and Slow Time", () => {
  for (const kind of ["fireball", "hurdle"])
    for (const fps of [30, 60, 120])
      for (const speed of [260, 316.8, 391.6, 422.4, 440])
        for (const scale of [1, 0.6]) {
          const motion = new HazardMotion(kind);
          let y = GIANT_RELEASE_Y,
            time = 0;
          for (let step = 0; step < 2000; step++) {
            const old = y;
            y = motion.advance(y, 1 / fps, speed * scale, scale, false);
            if (crossesRunner(old, y, kind === "fireball" ? 72 : 24)) break;
            time += 1000 / fps;
          }
          // Use the beginning of the contact frame, so this is a conservative discrete bound.
          expect(time + SABOTEUR.warningMs + 1000 / fps).toBeGreaterThanOrEqual(1200 - 1e-6);
        }
});
it("keeps clean-jump rewards below pot drain even with the fastest legal rotation and Slow Drain", () => {
  const maximumPointsPerSecond = 50 / ((SABOTEUR.castGapMs / 1000) * GIANT_ROTATION.length);
  expect(maximumPointsPerSecond).toBeLessThan(SCORE.drainPerSec / 2 / 1.15);
  expect(SABOTEUR.castGapMs).toBe(2000);
  expect(SABOTEUR.fireCooldownMs).toBe(3000);
});
