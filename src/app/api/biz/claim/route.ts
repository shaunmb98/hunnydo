import { adminDb, handler, HttpError, userDoc } from "@/lib/admin";
import { amount, businessesCol, cleanTrades } from "@/lib/biz-admin";
import { getListing } from "@/lib/biz-places";
import type { Business } from "@/lib/biz-types";

/**
 * Claim a Google listing as your business. The claim is recorded as unverified:
 * nothing here proves ownership yet, and nobody gets called or texted.
 */
export const POST = handler<{ placeId?: string; trades?: unknown; radiusMi?: unknown }>(async ({ uid, email, body }) => {
  const placeId = typeof body.placeId === "string" ? body.placeId.trim() : "";
  if (!/^[\w-]{10,300}$/.test(placeId)) throw new HttpError(400, "Pick your business from the list first.");
  const trades = cleanTrades(body.trades);
  if (!trades.length) throw new HttpError(400, "Pick at least one kind of work you do.");
  const radiusMi = Math.min(100, Math.max(1, amount(body.radiusMi, 500) ?? 15));

  const listing = await getListing(placeId);
  if (!listing.name || listing.lat == null || listing.lng == null) {
    throw new HttpError(422, "We couldn't read that listing from Google. Try another one.");
  }

  const ref = businessesCol().doc(placeId);
  const business = await adminDb.runTransaction(async (tx) => {
    const [existing, user] = await Promise.all([tx.get(ref), tx.get(userDoc(uid))]);
    if (existing.exists) {
      if (existing.data()?.ownerUid !== uid) {
        throw new HttpError(409, "Someone else has already claimed this listing. If it's yours, email us and we'll sort it out.");
      }
      return existing.data() as Business;
    }
    const current = user.data()?.businessId;
    if (current && current !== placeId) throw new HttpError(409, "This login already has a business. One business per login for now.");
    const doc: Business = {
      ownerUid: uid,
      placeId,
      name: listing.name,
      phone: listing.phone,
      website: listing.website,
      address: listing.address,
      lat: listing.lat!,
      lng: listing.lng!,
      rating: listing.rating,
      reviewCount: listing.reviewCount,
      trades,
      radiusMi,
      about: "",
      serviceFeeCredited: false,
      licenseNumber: "",
      verified: false,
      verification: { method: "phone", status: "pending" },
      createdAt: Date.now(),
    };
    tx.set(ref, doc);
    tx.set(userDoc(uid), { businessId: placeId, ...(email ? { email } : {}) }, { merge: true });
    return doc;
  });
  return { business };
});
