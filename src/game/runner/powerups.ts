import type { PowerupKind } from "../../shared/world";
import type { Lane } from "../../shared/types";
import { pickItemLane } from "./items";
import { POWERUPS } from "./config";

export const POWERUP_KINDS: readonly PowerupKind[] = [
  "shield",
  "slowmo",
  "double",
  "blast",
  "giant-slow",
];

/** Every cycle includes all five kinds. New pickups lead the opening cycle; repeats cannot straddle cycles. */
export class PowerupBag {
  private bag: PowerupKind[] = [];
  private first = true;
  private last: PowerupKind | undefined;
  constructor(private rng: () => number = Math.random) {}
  next(): PowerupKind {
    if (!this.bag.length) {
      this.bag = [...POWERUP_KINDS];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.first) {
        const newKinds = (kind: PowerupKind) => kind === "blast" || kind === "giant-slow";
        this.bag = [...this.bag.filter(newKinds), ...this.bag.filter((kind) => !newKinds(kind))];
        this.first = false;
      } else if (this.bag[0] === this.last) {
        [this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]];
      }
    }
    this.last = this.bag.shift()!;
    return this.last;
  }
}

/** Uses play time; delayed frames never create catch-up bursts or consume a blocked pickup. */
export class PowerupDrops {
  private nextAt = -1;
  private bag: PowerupBag;
  constructor(private rng: () => number = Math.random) {
    this.bag = new PowerupBag(rng);
  }
  next(
    now: number,
    obstacles: readonly { lane: Lane; y: number }[],
  ): { kind: PowerupKind; lane: Lane } | null {
    if (!Number.isFinite(now)) return null;
    if (this.nextAt < 0) {
      this.nextAt = now + POWERUPS.firstMs;
      return null;
    }
    if (now < this.nextAt) return null;
    const lane = pickItemLane(obstacles, this.rng);
    this.nextAt = now + (lane === null ? POWERUPS.retryMs : POWERUPS.everyMs);
    return lane === null ? null : { lane, kind: this.bag.next() };
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
