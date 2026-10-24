import { describe, expect, it } from "vitest";
import { DEFAULT_CAMPAIGN, parseCampaign, campaignLevelAt } from "./campaign";
describe("campaign contract", () => {
  it("validates the authored fallback", () =>
    expect(parseCampaign(DEFAULT_CAMPAIGN)).toEqual(DEFAULT_CAMPAIGN));
  it("rejects unsafe difficulty or unknown content", () => {
    const campaign = structuredClone(DEFAULT_CAMPAIGN);
    campaign.levels[0].speedMultiplier = 8;
    expect(() => parseCampaign(campaign)).toThrow();
    expect(() => parseCampaign({ ...DEFAULT_CAMPAIGN, intro: [] })).toThrow();
  });
  it("rejects difficulty reversals", () => {
    const campaign = structuredClone(DEFAULT_CAMPAIGN);
    campaign.levels[1].spawnIntervalMs = 5000;
    expect(() => parseCampaign(campaign)).toThrow();
  });
  it("advances at chapter boundaries and completes after all chapters", () => {
    expect(campaignLevelAt(0).index).toBe(0);
    expect(campaignLevelAt(30).index).toBe(1);
    expect(campaignLevelAt(65).index).toBe(2);
    expect(campaignLevelAt(105).complete).toBe(true);
  });
});
