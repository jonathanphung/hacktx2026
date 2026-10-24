import type Phaser from "phaser";
import type { Lane } from "../../shared/types";
import type { ObstacleSpec } from "../../shared/world";
import type { HazardMix } from "./stage-tuning";

export const TRAIL = {
  firstMs: 5000,
  retryMs: 600,
};

/** One lane, or two distinct lanes (always leaving an escape lane). */
export function naturalLanes(count: 1 | 2, rng: () => number = Math.random): Lane[] {
  const first = Math.floor(rng() * 3) as Lane;
  return count === 1 ? [first] : [first, ((first + 1 + Math.floor(rng() * 2)) % 3) as Lane];
}

/** Uses the same pause-adjusted game clock; never catches up with a burst. */
export class TrailSpawner {
  private nextAt = -1;
  /** True when a wave should spawn now. `intervalMs` = wait until the next wave. */
  due(now: number, entranceBlocked: boolean, intervalMs: number): boolean {
    if (this.nextAt < 0) {
      this.nextAt = now + TRAIL.firstMs;
      return false;
    }
    if (now < this.nextAt) return false;
    this.nextAt = now + (entranceBlocked ? TRAIL.retryMs : intervalMs);
    return !entranceBlocked;
  }

  /** No waves before `until` (e.g. the calm after entering a new stage). */
  holdUntil(until: number): void {
    this.nextAt = Math.max(this.nextAt, until);
  }
}

const DEFAULT_MIX: HazardMix = { thorns: 0.4, rock: 0.35, sap: 0.25 };

/** Natural hazards grow on the path; they do not use the giant's attack pool. */
export function trailHazard(lane: Lane, roll: number, mix: HazardMix = DEFAULT_MIX): ObstacleSpec {
  const total = mix.thorns + mix.rock + mix.sap;
  const r = roll * total;
  const kind =
    r < mix.thorns ? "wild-thorns" : r < mix.thorns + mix.rock ? "moss-rock" : "sticky-sap";
  const jumpable = kind !== "moss-rock";
  const effect = kind === "sticky-sap" ? "slow" : "end-run";
  const width = 110,
    height = kind === "wild-thorns" ? 28 : 48;
  return {
    kind,
    lane,
    jumpable,
    effect,
    width,
    height,
    createView: (scene, x, y) => drawTrailHazard(scene, x, y, kind, width, height),
  };
}

function drawTrailHazard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  kind: string,
  width: number,
  height: number,
) {
  const g = scene.add.graphics();
  const w = width / 2,
    h = height / 2;
  if (kind === "wild-thorns") {
    g.fillStyle(0x284936);
    g.fillRoundedRect(-w, -h, width, height, 7);
    g.lineStyle(5, 0x6e9c58);
    g.lineBetween(-w + 5, 3, w - 5, -3);
    g.fillStyle(0xd6dc9a);
    for (let i = -2; i <= 2; i++) g.fillTriangle(i * 20 - 6, -3, i * 20, -h - 4, i * 20 + 5, -3);
    g.fillStyle(0xc5a4e3);
    g.fillCircle(-w + 15, -2, 5);
    g.fillCircle(w - 14, 2, 5);
  } else if (kind === "moss-rock") {
    g.fillStyle(0x3d4a4d);
    g.fillRoundedRect(-w, -h, width, height, 11);
    g.fillStyle(0x899789);
    g.fillRoundedRect(-w + 4, -h + 3, width - 8, height - 10, 9);
    g.lineStyle(2, 0xc6c9a5);
    g.lineBetween(-w + 14, -h + 8, w - 20, -h + 8);
    g.fillStyle(0x5a8a54);
    g.fillEllipse(-w + 20, h - 7, 36, 13);
    g.fillEllipse(w - 23, h - 8, 40, 14);
    g.fillStyle(0xe4b9d8);
    g.fillCircle(w - 15, h - 11, 4);
  } else {
    g.fillStyle(0x785328);
    g.fillEllipse(0, 0, width, height);
    g.fillStyle(0xd4a24b);
    g.fillEllipse(-4, -2, width * 0.86, height * 0.8);
    g.fillStyle(0xffdf91);
    g.fillEllipse(-w * 0.3, -h * 0.25, 30, 10);
    g.fillCircle(w * 0.3, 4, 4);
  }
  return scene.add.container(x, y, [g]).setDepth(6);
}
