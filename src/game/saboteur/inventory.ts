/** FIFO stock: one recharge every three seconds, with a safe gap between bursts. */
export class GiantInventory {
  readonly cards: string[] = [];
  capacity = 1;
  private refillAt = Infinity;
  private cooldownFactor = 1;
  constructor(private draw: () => string) {
    this.cards.push(draw());
  }
  grow(completed: number): void {
    const capacity = Math.min(3, 1 + Math.floor(completed / 2));
    while (this.capacity < capacity) {
      this.capacity++;
      this.cards.push(this.draw());
    }
  }
  take(now: number): string | undefined {
    const card = this.cards.shift();
    if (card && this.refillAt === Infinity)
      this.refillAt = now + SABOTEUR.fireCooldownMs * this.cooldownFactor;
    return card;
  }
  update(now: number): boolean {
    if (now < this.refillAt) return false;
    if (this.cards.length < this.capacity) this.cards.push(this.draw());
    this.refillAt =
      this.cards.length < this.capacity
        ? now + SABOTEUR.fireCooldownMs * this.cooldownFactor
        : Infinity;
    return true;
  }
  setCooldownFactor(now: number, factor: number): void {
    if (!(factor > 0) || !Number.isFinite(factor)) return;
    if (Number.isFinite(this.refillAt) && this.refillAt > now)
      this.refillAt = now + ((this.refillAt - now) * factor) / this.cooldownFactor;
    this.cooldownFactor = factor;
  }
  wait(now: number): number {
    return Math.max(0, this.refillAt - now);
  }
}
import { SABOTEUR } from "./config";
