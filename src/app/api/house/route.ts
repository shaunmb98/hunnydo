import { handler, HttpError, userDoc } from "@/lib/admin";
import { lookupHouse } from "@/lib/house-records";
import { HOMEOWNER_FIELDS, type HouseFacts } from "@/lib/house-types";
import type { UserProfile } from "@/lib/types";

export const runtime = "nodejs";

/** Look up public records for the caller's saved home and merge them into users/{uid}.house. */
export const POST = handler(async ({ uid }) => {
  const ref = userDoc(uid);
  const profile = ((await ref.get()).data() ?? {}) as Partial<UserProfile>;
  if (!profile.home) throw new HttpError(400, "Add your home address first.");

  const result = await lookupHouse(profile.home);
  const existing: Partial<HouseFacts> = profile.house ?? {};

  if (result.coverage === "none") {
    // Keep whatever is already saved. Nothing new to write.
    const facts: HouseFacts = { ...existing, source: existing.source ?? "manual" };
    return { facts, permits: profile.housePermits ?? [], coverage: "none" as const };
  }

  // County facts go in, but never over something the homeowner typed.
  const county: Record<string, unknown> = { ...result.facts };
  for (const key of HOMEOWNER_FIELDS) delete county[key];
  for (const k of Object.keys(county)) if (county[k] === undefined) delete county[k];

  await ref.set({ house: county, housePermits: result.permits }, { merge: true });
  const facts = { ...existing, ...county } as HouseFacts;
  return { facts, permits: result.permits, coverage: result.coverage };
});
