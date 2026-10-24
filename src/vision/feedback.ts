import type { InputEvent } from "../shared/input";
import type { PlayerId } from "../shared/types";
import type { HandFrame } from "../shared/vision";

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
  frame(frame: HandFrame, received: number) {
    const state = this.states[frame.player];
    state.frame = frame;
    state.received = received;
    state.latency = Math.max(0, received - frame.t);
    state.error = null;
  }
  input(event: InputEvent, now: number) {
    const state = this.states[event.player];
    state.action =
      event.action === "aim"
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
      latency: state.latency,
    };
  }
}
