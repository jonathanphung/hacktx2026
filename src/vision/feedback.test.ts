import { expect, it } from "vitest";
import { VisionFeedback } from "./feedback";
import type { HandFrame } from "../shared/vision";
const hand: HandFrame = {
  player: "runner",
  t: 100,
  gesture: null,
  landmarks: Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 })),
};
it("shows a sent control only after the actual input event", () => {
  const feedback = new VisionFeedback();
  feedback.frame(hand, 120);
  expect(feedback.view("runner", 120).action).toBe("");
  feedback.input({ player: "runner", action: "left" }, 121);
  expect(feedback.view("runner", 122)).toMatchObject({
    action: "← LEFT",
    status: "Hand tracked",
    latency: 20,
  });
});
it("expires old skeletons and action badges instead of implying live inference", () => {
  const feedback = new VisionFeedback();
  feedback.frame(hand, 120);
  feedback.input({ player: "runner", action: "jump" }, 121);
  expect(feedback.view("runner", 400)).toMatchObject({
    landmarks: null,
    status: "Tracking delayed — controls paused",
  });
  expect(feedback.view("runner", 1100).action).toBe("");
});
it("explains the correct half when a hand is not detected", () => {
  const feedback = new VisionFeedback();
  feedback.frame({ ...hand, landmarks: null }, 110);
  expect(feedback.view("runner", 120).status).toContain("LEFT");
  feedback.fail("runner", "model unavailable");
  expect(feedback.view("runner", 120).status).toContain("model unavailable");
});
