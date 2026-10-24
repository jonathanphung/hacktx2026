/** Lane index, left to right on screen. */
export type Lane = 0 | 1 | 2;
export const LANES: readonly Lane[] = [0, 1, 2];

export type PlayerId = "runner" | "saboteur";

/** Which half of the shared webcam (in mirrored, on-screen terms) each player stands in. */
export const PLAYER_SIDE: Record<PlayerId, "left" | "right"> = {
  runner: "left",
  saboteur: "right",
};

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** A 2D point in normalized [0, 1] coordinates, already mirrored to match what players see. */
export interface Point {
  x: number;
  y: number;
}
