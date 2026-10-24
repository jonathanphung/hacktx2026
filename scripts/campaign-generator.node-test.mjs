import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCampaign } from "./generate-campaign.mjs";
import { DEFAULT_CAMPAIGN } from "../src/shared/campaign.ts";

test("validates Gemini output and keeps the key out of the request body", async () => {
  let sent;
  const result = await generateCampaign({
    apiKey: "test-key",
    fetcher: async (url, options) => {
      sent = { url, options };
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: JSON.stringify(DEFAULT_CAMPAIGN) }] },
            },
          ],
        }),
      };
    },
  });
  assert.equal(result.levels.length, 3);
  assert.equal(sent.options.headers["x-goog-api-key"], "test-key");
  assert.equal(sent.options.body.includes("test-key"), false);
});
test("rejects missing credentials before making a request", async () => {
  let called = false;
  await assert.rejects(
    generateCampaign({
      fetcher: async () => {
        called = true;
      },
    }),
    /GEMINI_API_KEY/,
  );
  assert.equal(called, false);
});
test("rejects failed requests, truncated replies, and unsafe difficulty", async () => {
  await assert.rejects(
    generateCampaign({ apiKey: "test", fetcher: async () => ({ ok: false, status: 429 }) }),
    /HTTP 429/,
  );
  await assert.rejects(
    generateCampaign({
      apiKey: "test",
      fetcher: async () => ({
        ok: true,
        json: async () => ({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
      }),
    }),
    /complete campaign/,
  );
  const bad = structuredClone(DEFAULT_CAMPAIGN);
  bad.levels[0].speedMultiplier = 100;
  await assert.rejects(
    generateCampaign({
      apiKey: "test",
      fetcher: async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            { finishReason: "STOP", content: { parts: [{ text: JSON.stringify(bad) }] } },
          ],
        }),
      }),
    }),
    /invalid story/,
  );
});
