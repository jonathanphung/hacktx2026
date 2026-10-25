/** Deliberate alternating low/solid/surface sequence, shared by the preview and actual draws. */
export const GIANT_ROTATION = ["barrier", "hurdle", "oil", "mud", "fireball"] as const;
export class AttackRotation {
  private cursor = 0;
  next(): string {
    const id = GIANT_ROTATION[this.cursor];
    this.cursor = (this.cursor + 1) % GIANT_ROTATION.length;
    return id;
  }
  peek(count = 3): string[] {
    return Array.from(
      { length: count },
      (_, i) => GIANT_ROTATION[(this.cursor + i) % GIANT_ROTATION.length],
    );
  }
}
