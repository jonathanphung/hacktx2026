import { expect, it } from "vitest";
import type { Point } from "../../shared/types";
import { effectivePose, poseFromLandmarks } from "./hand-pose";

/** Synthetic hand: wrist at (0.5, 0.9); knuckles 0.2 up; tips `reach` × that from the wrist. */
function hand(reach: number, scale = 1, fingers = [0, 1, 2, 3]): Point[] {
  const lm: Point[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.9 }));
  const spread = [-0.06, -0.02, 0.02, 0.06];
  [5, 9, 13, 17].forEach((mcp, i) => {
    lm[mcp] = { x: 0.5 + spread[i] * scale, y: 0.9 - 0.2 * scale };
    const r = fingers.includes(i) ? reach : 2;
    lm[mcp + 3] = { x: 0.5 + spread[i] * scale, y: 0.9 - 0.2 * scale * r };
  });
  return lm;
}

it("reads a curled hand as a fist and a straight one as an open palm, at any scale", () => {
  for (const scale of [0.4, 1, 1.6]) {
    expect(poseFromLandmarks(hand(0.8, scale))).toBe("Closed_Fist");
    expect(poseFromLandmarks(hand(2, scale))).toBe("Open_Palm");
  }
});
it("is undecided for pointing, partial curls and bad input", () => {
  expect(poseFromLandmarks(hand(0.8, 1, [1, 2, 3]))).toBeNull();
  expect(poseFromLandmarks(hand(1.25))).toBeNull();
  expect(poseFromLandmarks(null)).toBeNull();
  expect(poseFromLandmarks(Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 })))).toBeNull();
});
it("lets a confident classifier win but fills its gaps and thumbs-up misreads", () => {
  expect(effectivePose("Open_Palm", hand(0.8))).toBe("Open_Palm");
  expect(effectivePose(null, hand(0.8))).toBe("Closed_Fist");
  expect(effectivePose("Thumb_Up", hand(0.8))).toBe("Closed_Fist");
  expect(effectivePose("Victory", hand(1.25))).toBe("Victory");
});
