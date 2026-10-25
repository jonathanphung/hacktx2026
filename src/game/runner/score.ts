/** Score tuning: each tale is worth a pot of points that drains while Jon takes his time. */
export const SCORE = {
  /** Points in a tale's pot when the tale begins. */
  potStart: 2000,
  /** Points the pot loses per second. */
  drainPerSec: 40,
  /** The pot never drains below this, so finishing a slow tale is still worth something. */
  potFloor: 200,
};

/**
 * Per-tale pots. Collecting a tale's item banks what's left of its pot; being caught loses the
 * pot in progress. The score is what's banked, so finishing faster and getting further both
 * score higher, and getting caught early is never the best strategy.
 */
export class TalePots {
  banked = 0;
  pot: number = SCORE.potStart;

  /** Drains the current pot over `ms` of play. `slowdown` > 1 drains more slowly (bonuses). */
  drain(ms: number, slowdown = 1): void {
    this.pot = Math.max(SCORE.potFloor, this.pot - (SCORE.drainPerSec * ms) / 1000 / slowdown);
  }

  /** The tale's item was collected: keep what's left (plus any bonus) and start a fresh pot. */
  bank(bonus = 0): void {
    this.banked += Math.floor(this.pot) + bonus;
    this.pot = SCORE.potStart;
  }

  get score(): number {
    return this.banked;
  }
}
