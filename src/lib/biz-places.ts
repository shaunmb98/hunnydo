import "server-only";
import { HttpError } from "./admin";
import type { Listing } from "./biz-types";

const BASE = "https://places.googleapis.com/v1";
const FIELDS = ["id", "displayName", "formattedAddress", "location", "rating", "userRatingCount", "nationalPhoneNumber", "websiteUri", "businessStatus"];

interface GPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  businessStatus?: string;
}

async function g<T>(path: string, fieldMask: string, body?: unknown): Promise<T> {
  const key = process.env.MAPS_SERVER_KEY;
  if (!key) throw new HttpError(500, "Maps key is not configured.");
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": fieldMask },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[biz-places]", path, res.status, await res.text());
    throw new HttpError(502, "Google Places didn't answer. Try again in a moment.");
  }
  return (await res.json()) as T;
}

const toListing = (p: GPlace): Listing => ({
  placeId: p.id,
  name: p.displayName?.text ?? "",
  address: p.formattedAddress,
  phone: p.nationalPhoneNumber,
  website: p.websiteUri,
  rating: p.rating,
  reviewCount: p.userRatingCount,
  lat: p.location?.latitude,
  lng: p.location?.longitude,
});

/** Google listings matching a business name and city, for the claim screen. */
export async function searchBusinesses(query: string): Promise<Listing[]> {
  const data = await g<{ places?: GPlace[] }>("/places:searchText", FIELDS.map((f) => `places.${f}`).join(","), {
    textQuery: query,
    maxResultCount: 8,
    regionCode: "us",
  });
  return (data.places ?? [])
    .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY" && p.displayName?.text)
    .map(toListing);
}

/** One listing, read fresh from Google so a claim never trusts what the browser sent. */
export async function getListing(placeId: string): Promise<Listing> {
  return toListing(await g<GPlace>(`/places/${placeId}`, FIELDS.join(",")));
}
