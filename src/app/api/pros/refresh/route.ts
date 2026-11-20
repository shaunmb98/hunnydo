import { adminDb, handler, HttpError, prosCol, userDoc } from "@/lib/admin";
import { searchPros } from "@/lib/places";
import { TRADE_IDS } from "@/lib/trades";
import type { TradeId, UserProfile } from "@/lib/types";

/**
 * Pull up to 20 nearby pros for one trade from Google and cache them under the user.
 * Contract: POST {trade} -> {count}.
 */
export const POST = handler<{ trade?: string }>(async ({ uid, body }) => {
  const trade = body.trade as TradeId;
  if (!TRADE_IDS.includes(trade)) throw new HttpError(400, "Pick a trade we know about.");

  const profile = (await userDoc(uid).get()).data() as UserProfile | undefined;
  if (!profile?.home) throw new HttpError(409, "Tell us where home is first.");

  const found = await searchPros(trade, profile.home);
  const now = Date.now();

  if (found.length) {
    const col = prosCol(uid);
    const existing = await adminDb.getAll(...found.map((p) => col.doc(p.id)));
    const batch = adminDb.batch();
    found.forEach((pro, i) => {
      const ref = col.doc(pro.id);
      if (existing[i].exists) {
        // Only refresh what Google told us. Everything the homeowner or the review
        // analysis added (inCrew, notes, responsiveness, reviews, jobsCount, createdAt)
        // stays exactly as it is, and so does the trade it was first filed under.
        batch.set(
          ref,
          {
            name: pro.name,
            rating: pro.rating,
            reviewCount: pro.reviewCount,
            phone: pro.phone,
            website: pro.website,
            address: pro.address,
            lat: pro.lat,
            lng: pro.lng,
            distanceMi: pro.distanceMi,
            openNow: pro.openNow,
            hours: pro.hours,
            mapsUrl: pro.mapsUrl,
            fetchedAt: now,
          },
          { merge: true },
        );
      } else {
        batch.set(ref, pro);
      }
    });
    await batch.commit();
  }

  await userDoc(uid).set({ prosFetchedAt: now }, { merge: true });
  return { count: found.length };
});
