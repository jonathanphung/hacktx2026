/**
 * Fires once each time the hand closes into a fist (rising edge), after the fist has been
 * held for `holdFrames` frames — filters out single-frame misclassifications.
 */
export class FistTrigger {
  private streak = 0;
  private armed = true;

  constructor(private holdFrames = 2) {}

  push(gesture: string | null): boolean {
    if (gesture !== "Closed_Fist") {
      this.streak = 0;
      this.armed = true;
      return false;
    }
    this.streak++;
    if (this.armed && this.streak >= this.holdFrames) {
      this.armed = false;
      return true;
    }
    return false;
  }
}
