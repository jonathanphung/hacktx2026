/** FIFO stock: one recharge every four seconds, with a safe gap between bursts. */
export class GiantInventory {
  readonly cards: string[] = [];
  capacity = 1;
  private refillAt = Infinity;
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
    if (card && this.refillAt === Infinity) this.refillAt = now + 4000;
    return card;
  }
  update(now: number): boolean {
    if (now < this.refillAt) return false;
    if (this.cards.length < this.capacity) this.cards.push(this.draw());
    this.refillAt = this.cards.length < this.capacity ? now + 4000 : Infinity;
    return true;
  }
  wait(now: number): number {
    return Math.max(0, this.refillAt - now);
  }
}
