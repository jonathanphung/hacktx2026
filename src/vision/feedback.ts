import type { GameEvents } from "../shared/world";
import type { InputEvent } from "../shared/input";
import type { PlayerId } from "../shared/types";
import type { HandFrame } from "../shared/vision";
import { DROPOUT_BRIDGE_MS } from "./interpreter";

const names = { left: "← LEFT", right: "RIGHT →", jump: "↑ JUMP", fire: "FIRE" };
/** The displayed control is acknowledged only from the same event sent to the game. */
export class VisionFeedback {
  private states: Record<
    PlayerId,
    {
      frame: HandFrame | null;
      received: number;
      latency: number;
      action: string;
      actionAt: number;
      error: string | null;
      lastHand?: { frame: HandFrame; at: number };
    }
  > = {
    runner: {
      frame: null,
      received: -Infinity,
      latency: 0,
      action: "",
      actionAt: -Infinity,
      error: null,
    },
    saboteur: {
      frame: null,
      received: -Infinity,
      latency: 0,
      action: "",
      actionAt: -Infinity,
      error: null,
    },
  };
  private game: { status: GameEvents["saboteur-status"]; at: number } | null = null;
  private rejection: { text: string; until: number } | null = null;
  /** Authoritative saboteur state from the game: what actually happened to the sent command. */
  status(status: GameEvents["saboteur-status"], now: number) {
    this.game = { status, at: now };
  }
  result(result: GameEvents["cast-result"], now: number) {
    if (result.accepted || result.reason === "game-over") return void (this.rejection = null);
    const why = { cooldown: "COOLDOWN", empty: "NO CARDS", starting: "NOT READY" }[result.reason!];
    this.rejection = { text: `REJECTED: ${why ?? "NOT READY"}`, until: now + 900 };
  }
  private cast(now: number) {
    if (this.rejection && now < this.rejection.until)
      return { text: this.rejection.text, tone: "bad" as const };
    if (!this.game || this.game.status.state === "over") return null;
    const { state, remainingMs } = this.game.status;
    const left = Math.max(0, remainingMs - (now - this.game.at));
    const seconds = (left / 1000).toFixed(1);
    if (state === "queued" && left > 0)
      return { text: `CAST QUEUED ${seconds}s`, tone: "wait" as const };
    if (state === "cooldown" && left > 0)
      return { text: `COOLDOWN ${seconds}s`, tone: "bad" as const };
    if (state === "empty") return { text: "NO CARDS", tone: "bad" as const };
    return { text: "READY", tone: "ready" as const };
  }
  frame(frame: HandFrame, received: number) {
    const state = this.states[frame.player];
    // A fast hand blinks out for a frame or two; keep showing the last hand so the skeleton
    // and "Hand tracked" don't flash (the interpreter bridges the same gaps for controls).
    const held = state.lastHand;
    if (frame.landmarks) state.lastHand = { frame, at: frame.t };
    else if (held && frame.t - held.at <= DROPOUT_BRIDGE_MS)
      frame = { ...frame, landmarks: held.frame.landmarks, gesture: held.frame.gesture };
    state.frame = frame;
    state.received = received;
    state.latency = Math.max(0, received - frame.t);
    state.error = null;
  }
  input(event: InputEvent, now: number) {
    const state = this.states[event.player];
    state.action =
      event.action === "cycle"
        ? "NEXT CARD"
        : event.action === "aim"
          ? `AIM ${event.lane + 1}`
          : event.action === "select"
            ? `CARD ${event.slot + 1}`
            : names[event.action];
    state.actionAt = now;
  }
  fail(player: PlayerId, message: string) {
    this.states[player].error = message;
  }
  view(player: PlayerId, now: number) {
    const state = this.states[player];
    const fresh = !!state.frame && state.latency <= 180 && now - state.frame.t <= 250;
    return {
      landmarks: fresh ? (state.frame?.landmarks ?? null) : null,
      pose:
        fresh && state.frame?.landmarks && player === "saboteur"
          ? (state.frame.gesture ?? "Uncertain")
          : null,
      status: state.error
        ? `TRACKER ERROR: ${state.error}`
        : !state.frame
          ? "Waiting for model…"
          : !fresh
            ? "Tracking delayed — controls paused"
            : state.frame.landmarks
              ? "Hand tracked"
              : `Show hand in ${player === "runner" ? "LEFT" : "RIGHT"} half`,
      action: now - state.actionAt < 900 ? state.action : "",
      cast: player === "saboteur" ? this.cast(now) : null,
      latency: state.latency,
    };
  }
}
