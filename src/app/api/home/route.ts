import { handler, HttpError, userDoc } from "@/lib/admin";
import { resolveHome } from "@/lib/places";

/** Resolve a chosen address suggestion and save it as the user's home. */
export const POST = handler<{ placeId?: string }>(async ({ uid, email, body }) => {
  const placeId = typeof body.placeId === "string" ? body.placeId.trim() : "";
  if (!placeId || !/^[\w-]{10,300}$/.test(placeId)) {
    throw new HttpError(400, "Pick an address from the list first.");
  }
  const home = await resolveHome(placeId);
  if (!Number.isFinite(home.lat) || !Number.isFinite(home.lng)) {
    throw new HttpError(422, "We couldn't place that address on the map. Try another one.");
  }
  await userDoc(uid).set({ home, ...(email ? { email } : {}) }, { merge: true });
  return { home };
});
