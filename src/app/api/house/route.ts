import { FieldValue } from "firebase-admin/firestore";
import { handler, HttpError, userDoc } from "@/lib/admin";
import { lookupHouse } from "@/lib/house-records";
import { searchHouseRecords } from "@/lib/house-search";
import { HOMEOWNER_FIELDS, type HouseFacts, type HouseLookup } from "@/lib/house-types";
import type { UserProfile } from "@/lib/types";

export const runtime = "nodejs";
// The web search fallback can take most of a minute.
export const maxDuration = 120;

const CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const WEB_SOURCE_NAME = "Public listings and records found online";
const HOMEOWNER = new Set<string>(HOMEOWNER_FIELDS);

/** Look up public records for the caller's saved home and merge them into users/{uid}.house. */
export const POST = handler<{ force?: boolean }>(async ({ uid, body }) => {
  const ref = userDoc(uid);
  const profile = ((await ref.get()).data() ?? {}) as Partial<UserProfile>;
  const home = profile.home;
  if (!home) throw new HttpError(400, "Add your home address first.");

  const stored: Partial<HouseFacts> = profile.house ?? {};
  const sameHome = stored.lookupLat === home.lat && stored.lookupLng === home.lng;

  // A recent lookup for this same spot is good enough. "Check again" sends force.
  if (
    body.force !== true &&
    sameHome &&
    (stored.source === "county" || stored.source === "web") &&
    stored.fetchedAt &&
    Date.now() - stored.fetchedAt < CACHE_MS
  ) {
    return {
      facts: stored as HouseFacts,
      permits: profile.housePermits ?? [],
      coverage: stored.source,
      cached: true,
    };
  }

  let result: HouseLookup = await lookupHouse(home);
  if (result.coverage === "none") {
    const web = await searchHouseRecords(home);
    result = {
      coverage: "web",
      permits: [],
      facts: {
        ...web.facts,
        source: "web",
        sourceName: WEB_SOURCE_NAME,
        fetchedAt: Date.now(),
        county: web.county,
        state: web.state,
        assessorUrl: web.assessorUrl,
        assessorName: web.assessorName,
        sources: web.sources,
      },
    };
  }

  // Looked-up facts go in, but never over something the homeowner typed.
  const found: Record<string, unknown> = { ...result.facts, lookupLat: home.lat, lookupLng: home.lng };
  for (const key of HOMEOWNER_FIELDS) delete found[key];
  for (const k of Object.keys(found)) if (found[k] === undefined) delete found[k];

  // Each lookup replaces the last one's record fields, so a previous address (or a stale search)
  // can't leave values behind. Only what the homeowner typed carries over.
  const kept: Record<string, unknown> = {};
  const clear: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(stored)) {
    if (HOMEOWNER.has(k)) kept[k] = v;
    else if (!(k in found)) clear[k] = FieldValue.delete();
  }

  await ref.set({ house: { ...clear, ...found }, housePermits: result.permits }, { merge: true });
  const facts = { ...kept, ...found } as unknown as HouseFacts;
  return { facts, permits: result.permits, coverage: result.coverage };
});
