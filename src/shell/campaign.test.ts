import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CAMPAIGN } from "../shared/campaign";

describe("saved campaign loading", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());
  it("loads a validated saved adventure once", async () => {
    const saved = structuredClone(DEFAULT_CAMPAIGN);
    saved.title = "The Moonlit Gate";
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => saved }));
    vi.stubGlobal("fetch", fetcher);
    const { loadCampaign } = await import("./campaign");
    expect((await loadCampaign()).title).toBe("The Moonlit Gate");
    await loadCampaign();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("uses the authored fallback for missing files", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false })),
    );
    const { loadCampaign } = await import("./campaign");
    expect((await loadCampaign()).title).toBe(DEFAULT_CAMPAIGN.title);
  });
  it("uses the fallback for invalid difficulty", async () => {
    const saved = structuredClone(DEFAULT_CAMPAIGN);
    saved.levels[0].naturalHazards = 2;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => saved })),
    );
    const { loadCampaign } = await import("./campaign");
    expect((await loadCampaign()).levels[0].naturalHazards).toBe(1);
  });
  it("uses the fallback when fetching fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const { loadCampaign } = await import("./campaign");
    expect((await loadCampaign()).levels).toHaveLength(3);
  });
});
