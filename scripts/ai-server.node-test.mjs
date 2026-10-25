import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTactics, makeServer, parseRequest } from "./ai-server.mjs";
const plan = { aim: "predict", preferredLane: 1, aggression: 0.7, jumpPreference: 0.5 };
const request = {
  role: "saboteur",
  difficulty: "normal",
  session: "test-session-123",
  snapshot: {
    runner: { lane: 1, x: 640, y: 610, airborne: false },
    speed: 300,
    stage: 0,
    obstacles: [],
    treasures: [],
  },
};
test("validates structured tactics and keeps the key out of the game prompt", async () => {
  const result = await generateTactics(request, {
    apiKey: "test-secret",
    fetchImpl: async (url, init) => {
      assert.match(url, /generativelanguage.googleapis.com/);
      assert.equal(init.headers["x-goog-api-key"], "test-secret");
      assert.ok(!init.body.includes("test-secret"));
      return {
        ok: true,
        json: async () => ({
          candidates: [
            { finishReason: "STOP", content: { parts: [{ text: JSON.stringify(plan) }] } },
          ],
        }),
      };
    },
  });
  assert.deepEqual(result, plan);
  assert.throws(() => parseRequest({ ...request, snapshot: { ...request.snapshot, speed: NaN } }));
  await assert.rejects(() =>
    generateTactics(request, {
      apiKey: "test-secret",
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
      }),
    }),
  );
});
test("server rejects cross-origin, invalid and rapid requests and returns valid plans", async () => {
  const server = makeServer({ generate: async () => plan });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/ai/tactics`;
  const post = (data, headers = {}) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(data),
    });
  try {
    assert.equal((await post(request, { Origin: "https://unknown.example" })).status, 403);
    assert.equal((await post({})).status, 400);
    const response = await post(request);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), plan);
    assert.equal((await post(request)).status, 429);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("server fails cleanly without exposing upstream errors or credentials", async () => {
  const server = makeServer({
    generate: async () => {
      throw new Error("private key detail");
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/ai/tactics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes("private key detail"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
