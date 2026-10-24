import { readFile, writeFile, rename } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { CAMPAIGN_SCHEMA, DEFAULT_CAMPAIGN, parseCampaign } from "../src/shared/campaign.ts";

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const PROMPT = `Create a short three-chapter retro fairy-tale adventure for "Jon and the Beanstalk".
Jon is a young wizard climbing living vines to recover stolen starlight. A second human plays the Giant.
Write exactly three opening dialogue beats, each under 200 characters, for a short illustrated face-off between Jon and the Giant before gameplay. Speaker order must be Jon, Giant, Jon. Jon challenges the Giant about the stolen starlight, the Giant taunts him about the climb, and Jon gives a brave reply. Use direct spoken dialogue, not narrator summaries.
Then design three chapters of 20-60 seconds each. Use grove, clouds, then castle themes.
Use existing natural hazards only: wild-thorns (jumpable lethal), moss-rock (dodge-only lethal), sticky-sap (jumpable slow).
The first chapter uses one natural hazard per wave. Later chapters may use two, never three. Each wave leaves an escape lane.
Difficulty must be nondecreasing: speedMultiplier cannot decrease, spawnIntervalMs cannot increase, naturalHazards cannot decrease.
Keep speedMultiplier 0.85-1.2 and spawnIntervalMs 1800-5500. Avoid impossible or extreme combinations.
Include concise chapter descriptions and a happy ending. No HTML, code, URLs, new mechanics, or third-party characters.
Return only JSON matching the supplied schema, with version 1.`;

/** The key is sent in a header to Google, never written into the generated artifact. */
export async function generateCampaign({
  apiKey,
  model = DEFAULT_MODEL,
  fetcher = fetch,
  prompt = PROMPT,
}) {
  if (!apiKey)
    throw new Error(
      "Set GEMINI_API_KEY in the ignored .env file before generating. Never use a VITE_ key.",
    );
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error("Invalid GEMINI_MODEL");
  const response = await fetcher(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          responseFormat: { text: { mimeType: "APPLICATION_JSON", schema: CAMPAIGN_SCHEMA } },
        },
      }),
    },
  );
  if (!response.ok)
    throw new Error(`Gemini request failed (HTTP ${response.status}). Existing campaign was kept.`);
  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason !== "STOP")
    throw new Error("Gemini did not finish a complete campaign. Existing campaign was kept.");
  const output = candidate.content?.parts
    ?.filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
  if (!output) throw new Error("Gemini returned no campaign text. Existing campaign was kept.");
  try {
    return parseCampaign(JSON.parse(output));
  } catch {
    throw new Error(
      "Gemini returned invalid story or difficulty settings. Existing campaign was kept.",
    );
  }
}

async function main() {
  const destination = new URL("../public/campaign.json", import.meta.url);
  if (process.argv.includes("--dry-run")) {
    parseCampaign(DEFAULT_CAMPAIGN);
    console.log(
      `Generation ready: ${process.env.GEMINI_MODEL || DEFAULT_MODEL}; 3 story beats, 3 bounded chapters. No API request made.`,
    );
    return;
  }
  if (process.argv.includes("--check")) {
    parseCampaign(JSON.parse(await readFile(destination, "utf8")));
    console.log("Saved campaign is valid.");
    return;
  }
  const campaign = await generateCampaign({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
  });
  // Validate first and replace atomically. Failed requests never overwrite the demo's saved story.
  const temporary = new URL("../public/campaign.json.tmp", import.meta.url);
  await writeFile(temporary, JSON.stringify(campaign, null, 2) + "\n", "utf8");
  await rename(temporary, destination);
  console.log(`Saved Gemini adventure "${campaign.title}" to public/campaign.json.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
