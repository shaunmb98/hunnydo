import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { structured } from "./ai";
import type { HouseFacts } from "./house-types";
import type { Home } from "./types";

// Fallback for homes outside the counties we read directly: Claude searches the web for the county,
// its assessor's lookup page and any facts a listing or record states for this exact address.
// Everything it returns is unconfirmed. See docs/house-records-spike.md.

const client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
const MODEL = "claude-opus-5-5";

export type HouseSearchResult = {
  facts: Partial<HouseFacts>;
  county?: string;
  state?: string;
  assessorUrl?: string;
  assessorName?: string;
  sources: { title: string; url: string }[];
};

const Extract = z.object({
  county: z.string().nullable(),
  state: z.string().nullable(),
  assessorName: z.string().nullable(),
  assessorUrl: z.string().nullable(),
  yearBuilt: z.number().nullable(),
  sqft: z.number().nullable(),
  lotSqft: z.number().nullable(),
  stories: z.number().nullable(),
  lastSaleYear: z.number().nullable(),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});

const researchPrompt = (address: string) => `Look up public housing records for this home: ${address}

Find and report:
1. Which county and state the address is in.
2. The official county assessor's property search page (or the equivalent office, such as the property appraiser, appraisal district or tax assessor): the office's name and the URL of its property search page.
3. Only if a search result states them for this exact address: year built, living area in square feet, lot size (say whether it is square feet or acres), number of stories, and the year of the last sale.

Rules:
- Report a value only when a source states it for this exact address. Name the source (title and URL) next to each value.
- If no source states a value for this address, write "not found" for it.
- Do not guess. Do not use neighboring homes, the street, the subdivision, or city averages.
- Do not report owner names or anything about the people who live there.

Answer as a short plain list.`;

const textOf = (content: Anthropic.ContentBlock[]) =>
  content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

const httpsUrl = (v?: string | null): string | undefined => {
  const s = (v ?? "").trim();
  if (!s.startsWith("https://")) return undefined;
  try {
    return new URL(s).toString();
  } catch {
    return undefined;
  }
};

const within = (v: number | null | undefined, min: number, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : undefined;

const str = (v?: string | null): string | undefined => v?.trim().slice(0, 120) || undefined;

/** Search the web for a home's county, assessor page and basic facts. Never throws. */
export async function searchHouseRecords(home: Home): Promise<HouseSearchResult> {
  const empty: HouseSearchResult = { facts: {}, sources: [] };
  try {
    const address = home.address.trim().slice(0, 300);
    if (!address) return empty;

    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: MODEL,
      max_tokens: 4000,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
      output_config: { effort: "low" },
      messages: [{ role: "user", content: researchPrompt(address) }],
    };
    let response = await client.messages.create(params);
    if (response.stop_reason === "pause_turn") {
      // The server-side search loop paused. Send its turn back once and it picks up where it left off.
      response = await client.messages.create({
        ...params,
        messages: [...params.messages, { role: "assistant", content: response.content }],
      });
    }
    if (response.stop_reason === "refusal") return empty;
    const research = textOf(response.content).trim();
    if (!research) return empty;

    const out = await structured({
      system:
        "You copy facts out of a research note about one home into fields. Use null for anything the note does not state for this exact address, or marks as not found or uncertain. Never fill a field from general knowledge or from other homes. Convert acres to square feet for lotSqft (1 acre is 43,560 sq ft). sources lists only the pages the note cites for its values, with their URLs exactly as written.",
      prompt: `Home address: ${address}\n\nResearch note:\n${research}`,
      schema: Extract,
      effort: "low",
      maxTokens: 2000,
    });

    const nextYear = new Date().getFullYear() + 1;
    const facts: Partial<HouseFacts> = {};
    const yearBuilt = within(out.yearBuilt, 1700, nextYear);
    const sqft = within(out.sqft, 200, 30_000);
    const lotSqft = within(out.lotSqft, 200, 50_000_000);
    const stories = within(out.stories, 1, 6);
    const lastSaleYear = within(out.lastSaleYear, 1900, nextYear);
    if (yearBuilt) facts.yearBuilt = yearBuilt;
    if (sqft) facts.sqft = sqft;
    if (lotSqft) facts.lotSqft = lotSqft;
    if (stories) facts.stories = stories;
    if (lastSaleYear) facts.lastSaleYear = lastSaleYear;

    const seen = new Set<string>();
    const sources: { title: string; url: string }[] = [];
    for (const s of out.sources ?? []) {
      const url = httpsUrl(s.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      sources.push({ title: s.title.trim().slice(0, 120) || new URL(url).hostname, url });
      if (sources.length >= 5) break;
    }

    return {
      facts,
      county: str(out.county),
      state: str(out.state),
      assessorName: str(out.assessorName),
      assessorUrl: httpsUrl(out.assessorUrl),
      sources,
    };
  } catch (err) {
    console.warn("[house-search] failed", err instanceof Error ? err.message : err);
    return empty;
  }
}
