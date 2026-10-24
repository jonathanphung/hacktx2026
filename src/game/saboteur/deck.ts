/** The saboteur's hand of attack cards: one random card dealt every `dealMs`, up to `handSize`. */
export class Deck {
  hand: string[] = [];
  selected = 0;
  /** Set on the first update(), so the deck runs on whatever clock the caller uses. */
  private nextDeal = -1;

  constructor(
    private pool: readonly string[],
    private opts: { dealMs: number; handSize: number; startingCards?: number },
    private rng: () => number = Math.random,
  ) {
    for (let i = 0; i < (opts.startingCards ?? 1); i++) this.deal();
  }

  /** Call every frame. Returns true if the hand changed. */
  update(now: number): boolean {
    if (this.nextDeal < 0) this.nextDeal = now + this.opts.dealMs;
    let changed = false;
    while (now >= this.nextDeal) {
      this.nextDeal += this.opts.dealMs;
      changed = this.deal() || changed;
    }
    return changed;
  }

  select(slot: number): boolean {
    if (slot < 0 || slot >= this.hand.length || slot === this.selected) return false;
    this.selected = slot;
    return true;
  }

  /** Removes and returns the selected card, or null if the hand is empty. */
  take(): string | null {
    if (!this.hand.length) return null;
    const [card] = this.hand.splice(this.selected, 1);
    this.selected = Math.min(this.selected, Math.max(0, this.hand.length - 1));
    return card;
  }

  private deal(): boolean {
    if (this.hand.length >= this.opts.handSize || !this.pool.length) return false;
    this.hand.push(this.pool[Math.floor(this.rng() * this.pool.length)]);
    return true;
  }
}
