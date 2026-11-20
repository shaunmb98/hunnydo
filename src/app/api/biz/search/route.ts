import { handler, HttpError } from "@/lib/admin";
import { businessesCol } from "@/lib/biz-admin";
import { searchBusinesses } from "@/lib/biz-places";

/** Find a business on Google by name and city, and say which listings are already claimed. */
export const POST = handler<{ query?: string }>(async ({ uid, body }) => {
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 120) : "";
  if (query.length < 3) throw new HttpError(400, "Type your business name and city.");
  const listings = await searchBusinesses(query);
  const snaps = listings.length
    ? await businessesCol().firestore.getAll(...listings.map((l) => businessesCol().doc(l.placeId)))
    : [];
  return {
    listings: listings.map((l, i) => ({
      ...l,
      claimed: snaps[i]?.exists ? (snaps[i].data()?.ownerUid === uid ? "you" : "other") : undefined,
    })),
  };
});
