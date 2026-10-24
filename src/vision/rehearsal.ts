import type { HandFrame } from "../shared/vision";

/** Synthetic examples, explicitly NOT real webcam recordings or accuracy benchmarks. */
export function rehearsalFrames(): HandFrame[] {
  const frames: HandFrame[] = [];
  for (let t = 0; t < 10000; t += 40) {
    const phase = Math.floor(t / 1000);
    const k = Math.min(1, (t % 1000) / 240);
    let x = 0.5;
    let y = 0.5;
    if (phase === 0) x = 0.75 - k * 0.5;
    if (phase === 1) x = 0.25 + k * 0.5;
    if (phase === 2) y = 0.75 - k * 0.5;
    if (phase === 3) y = 0.25 + k * 0.5;
    if (phase === 4) {
      const angle = ((t % 1000) / 960) * Math.PI * 2;
      x = 0.5 + Math.cos(angle) * 0.22;
      y = 0.5 + Math.sin(angle) * 0.22;
    }
    const point = { x, y };
    frames.push({
      player: "runner",
      t,
      gesture: null,
      landmarks: phase < 5 ? Array.from({ length: 21 }, () => ({ ...point })) : null,
    });
    frames.push({
      player: "saboteur",
      t,
      gesture: [
        "Open_Palm",
        "Open_Palm",
        "Open_Palm",
        "Open_Palm",
        "Open_Palm",
        "Open_Palm",
        "Open_Palm",
        "Closed_Fist",
        "Closed_Fist",
        "Open_Palm",
      ][phase],
      landmarks: Array.from({ length: 21 }, () => ({
        x: phase < 3 ? 0.15 : phase < 6 ? 0.5 : 0.85,
        y: 0.5,
      })),
    });
  }
  return frames;
}

/** Treat uploaded recordings as untrusted input; never evaluate file contents. */
export function parseRecording(text: string): HandFrame[] {
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value) || value.length === 0 || value.length > 18000)
    throw new Error("Expected 1–18000 landmark frames.");
  let last = -Infinity;
  for (const f of value) {
    if (
      !f ||
      (f.player !== "runner" && f.player !== "saboteur") ||
      !Number.isFinite(f.t) ||
      f.t < last ||
      (f.gesture !== null && typeof f.gesture !== "string")
    )
      throw new Error("Invalid frame or timestamps.");
    if (
      f.landmarks !== null &&
      (!Array.isArray(f.landmarks) ||
        f.landmarks.length !== 21 ||
        !f.landmarks.every(
          (p: { x: number; y: number }) =>
            p &&
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x >= 0 &&
            p.x <= 1 &&
            p.y >= 0 &&
            p.y <= 1,
        ))
    )
      throw new Error("Expected 21 normalized landmarks.");
    last = f.t;
  }
  if (value[value.length - 1].t - value[0].t > 300000)
    throw new Error("Recording must be under five minutes.");
  return value as HandFrame[];
}
