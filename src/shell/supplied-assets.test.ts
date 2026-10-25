import { describe, expect, it } from "vitest";
import { STAGES } from "../shared/stages";
import {
  obstacleArtLayout,
  obstacleTexture,
  pickupTexture,
  stageItemTexture,
  SUPPLIED_ART,
} from "./supplied-assets";

describe("supplied story artwork", () => {
  it("selects the themed log for every matching tale", () => {
    expect(STAGES.map((stage) => obstacleTexture("hurdle", stage.id))).toEqual([
      "story-log-humpty",
      "story-log-alice",
      "story-log-cinderella",
      "story-log-kt",
      "story-log-redhood",
      "story-log",
    ]);
  });

  it("uses registered assets for all attack and natural hazard families", () => {
    for (const kind of [
      "barrier",
      "double-wall",
      "fireball",
      "oil",
      "mud",
      "wild-thorns",
      "moss-rock",
      "sticky-sap",
    ]) {
      expect(Object.keys(SUPPLIED_ART)).toContain(obstacleTexture(kind, "humpty"));
    }
    expect(obstacleTexture("custom-trap", "humpty")).toBeNull();
  });

  it("selects level-specific hazards with shared fallbacks", () => {
    expect(obstacleTexture("fireball", "wonderland")).toBe("story-fireball-alice");
    expect(obstacleTexture("wild-thorns", "humpty")).toBe("story-spikes-humpty");
    expect(obstacleTexture("mud", "wonderland")).toBe("story-mud-alice");
    expect(obstacleTexture("sticky-sap", "mermaid")).toBe("story-mud-kt");
    expect(obstacleTexture("mud", "cinderella")).toBe("story-mud-cinderella");
    expect(obstacleTexture("barrier", "mermaid")).toBe("story-barrier-kt");
    expect(obstacleTexture("fireball", "xen")).toBe("story-fireball");
  });

  it("extends taller hazards upward while preserving contact baselines", () => {
    for (const kind of ["wild-thorns", "mud", "sticky-sap", "fireball"]) {
      const layout = obstacleArtLayout(kind, 80, 40);
      expect(layout.width).toBeGreaterThan(0);
      expect(layout.height).toBeGreaterThan(40);
      expect(layout.offsetY + layout.height / 2).toBe(20);
    }
    expect(obstacleArtLayout("hurdle", 80, 40)).toEqual({ width: 80, height: 40, offsetY: 0 });
  });

  it("matches the requested mud, fireball and oil collision proportions", () => {
    const mud = obstacleArtLayout("mud", 100, 40);
    expect(mud.width).toBe(153);
    expect(mud.width / mud.height).toBeCloseTo(87 / 235);
    expect(mud.offsetY + mud.height / 2).toBeCloseTo(20);
    expect(obstacleArtLayout("fireball", 100, 40)).toEqual({
      width: (75 * 92) / 248,
      height: 75,
      offsetY: -17.5,
    });
    const oil = obstacleArtLayout("oil", 100, 40);
    expect(oil.width).toBe(100);
    expect(oil.height / oil.width).toBeCloseTo(111 / 236);
    expect(oil.offsetY + oil.height / 2).toBeCloseTo(20);
  });

  it("preserves each themed mud and fireball source ratio", () => {
    for (const [kind, ratio] of [
      ["mud", 88 / 235],
      ["fireball", 92 / 250],
    ] as const) {
      const layout = obstacleArtLayout(kind, 110, 80, ratio);
      expect(layout.width / layout.height).toBeCloseTo(ratio);
      expect(layout.offsetY + layout.height / 2).toBeCloseTo(40);
    }
  });

  it("preserves source proportions and contact baselines for every obstacle family", () => {
    for (const kind of [
      "hurdle",
      "barrier",
      "double-wall",
      "wild-thorns",
      "moss-rock",
      "oil",
      "mud",
      "sticky-sap",
      "fireball",
    ]) {
      for (const ratio of [0.37, 1.2, 4.5]) {
        const bounds = obstacleArtLayout(kind, 140, 50, ratio);
        expect(bounds.width / bounds.height).toBeCloseTo(ratio);
        expect(bounds.offsetY + bounds.height / 2).toBeCloseTo(25);
      }
    }
  });

  it("enlarges barriers and reduces spikes uniformly with matching bounds", () => {
    const barrier = obstacleArtLayout("barrier", 140, 50, 2);
    expect(barrier.width).toBe(175);
    expect(barrier.height).toBe(87.5);
    const spikes = obstacleArtLayout("wild-thorns", 110, 28, 1.1);
    expect(spikes.width).toBe(55);
    expect(spikes.height).toBeCloseTo(50);
    expect(spikes.offsetY + spikes.height / 2).toBeCloseTo(14);
  });

  it("maps the egg and each other tale's item", () => {
    expect(stageItemTexture("egg")).toBe("story-egg");
    for (const stage of STAGES.slice(1)) {
      expect(Object.keys(SUPPLIED_ART)).toContain(stageItemTexture(stage.item.id));
    }
  });

  it("preserves the slow-drain pickup's meaning instead of labeling it x2", () => {
    expect(pickupTexture("double")).toBe("story-slow-drain-pickup");
    expect(pickupTexture("blast")).toBe("story-blast-pickup");
    expect(pickupTexture("giant-slow")).toBe("story-giant-slow-pickup");
    expect(pickupTexture("shield")).toBe("story-shield-pickup");
    expect(pickupTexture("slowmo")).toBe("story-slow-pickup");
  });
});
