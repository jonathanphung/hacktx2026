import type { PowerupKind } from "../../shared/world";
import { POWERUPS } from "./config";

export const POWERUP_KINDS: readonly PowerupKind[] = [
  "shield",
  "slowmo",
  "double",
  "blast",
  "giant-slow",
];

/** Shuffle bag: every five spawns contain each kind once, without changing the 8s cadence. */
export class PowerupBag {
  private bag: PowerupKind[] = [];
  constructor(private rng: () => number = Math.random) {}
  next(): PowerupKind {
    if (!this.bag.length) {
      this.bag = [...POWERUP_KINDS];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop()!;
  }
}

export const POWERUP_DURATION: Record<PowerupKind, number> = {
  shield: POWERUPS.shieldMs,
  slowmo: POWERUPS.slowmoMs,
  double: POWERUPS.doubleMs,
  blast: 0,
  "giant-slow": POWERUPS.giantSlowMs,
};

/** Which powerups are active and until when. Pure logic (no Phaser), so it's unit-tested. */
export class PowerupState {
  private freezeUntil = -Infinity;
  private until = new Map<PowerupKind, number>();

  /** Starts (or refreshes) a powerup. */
  activate(kind: PowerupKind, now: number): void {
    if (kind === "blast") return;
    if (kind === "slowmo") this.freezeUntil = now + 450;
    this.until.set(kind, now + POWERUP_DURATION[kind]);
  }

  isActive(kind: PowerupKind, now: number): boolean {
    return (this.until.get(kind) ?? -Infinity) > now;
  }

  /** Uses up the shield if one is active. Returns true if it absorbed the hit. */
  absorbHit(now: number): boolean {
    if (!this.isActive("shield", now)) return false;
    this.until.delete("shield");
    return true;
  }

  /** Removes and returns powerups whose time ran out. Call once per frame. */
  expire(now: number): PowerupKind[] {
    const done: PowerupKind[] = [];
    for (const [kind, until] of this.until) {
      if (until <= now) {
        this.until.delete(kind);
        done.push(kind);
      }
    }
    return done;
  }

  hazardsFrozen(now: number): boolean {
    return now < this.freezeUntil;
  }

  speedFactor(now: number): number {
    return this.isActive("slowmo", now) ? POWERUPS.slowmoFactor : 1;
  }

  scoreFactor(now: number): number {
    return this.isActive("double", now) ? 2 : 1;
  }
}
