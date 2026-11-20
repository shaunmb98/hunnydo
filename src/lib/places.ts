import "server-only";
import { HttpError } from "./admin";
import { trade as tradeInfo } from "./trades";
import type { Home, Pro, Review, TradeId } from "./types";

const KEY = () => {
  const k = process.env.MAPS_SERVER_KEY;
  if (!k) throw new HttpError(500, "Maps key is not configured.");
  return k;
};
const BASE = "https://places.googleapis.com/v1";

async function g<T>(path: string, fieldMask: string | null, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": KEY(),
      ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[places]", path, res.status, await res.text());
    throw new HttpError(502, "Google Places didn't answer. Try again in a moment.");
  }
  return (await res.json()) as T;
}

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(s)) * 10) / 10;
}

/** Address suggestions for the onboarding box. */
export async function autocompleteAddress(input: string) {
  const data = await g<{
    suggestions?: { placePrediction?: { placeId: string; text: { text: string } } }[];
  }>("/places:autocomplete", null, {
    input,
    includedPrimaryTypes: ["street_address", "premise", "subpremise"],
  });
  return (data.suggestions ?? [])
    .filter((s) => s.placePrediction)
    .map((s) => ({ placeId: s.placePrediction!.placeId, text: s.placePrediction!.text.text }));
}

/** Turn a chosen address suggestion into a Home with coordinates. */
export async function resolveHome(placeId: string): Promise<Home> {
  const p = await g<{
    formattedAddress: string;
    location: { latitude: number; longitude: number };
    addressComponents?: { longText: string; types: string[] }[];
  }>(`/places/${placeId}`, "formattedAddress,location,addressComponents");
  // "locality" covers most US addresses. Other places file the town under a different type (London uses postal_town).
  const part = (type: string) => p.addressComponents?.find((c) => c.types.includes(type))?.longText;
  const city =
    part("locality") ?? part("postal_town") ?? part("sublocality") ?? part("administrative_area_level_3") ?? part("administrative_area_level_2");
  return {
    address: p.formattedAddress,
    city,
    placeId,
    lat: p.location.latitude,
    lng: p.location.longitude,
  };
}

interface GPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  currentOpeningHours?: { openNow?: boolean };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  reviews?: {
    rating?: number;
    text?: { text: string };
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string };
  }[];
}

const LIST_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.currentOpeningHours.openNow",
  "places.regularOpeningHours.weekdayDescriptions",
].join(",");

/** Up to 20 local pros for one trade, near the home. Not yet saved anywhere. */
export async function searchPros(tradeId: TradeId, home: Home): Promise<Pro[]> {
  const t = tradeInfo(tradeId);
  const data = await g<{ places?: GPlace[] }>("/places:searchText", LIST_FIELDS, {
    // Search by town, not street address: a full address makes Google match too narrowly.
    textQuery: `${t.query} near ${home.city ?? home.address}`,
    maxResultCount: 20,
    locationBias: {
      circle: { center: { latitude: home.lat, longitude: home.lng }, radius: 25000 },
    },
  });
  const now = Date.now();
  return (data.places ?? [])
    .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY" && p.displayName?.text)
    .map((p): Pro => ({
      id: p.id,
      source: "google",
      name: p.displayName!.text,
      trade: tradeId,
      rating: p.rating,
      reviewCount: p.userRatingCount,
      phone: p.nationalPhoneNumber,
      website: p.websiteUri,
      address: p.formattedAddress,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      distanceMi: p.location
        ? milesBetween(home, { lat: p.location.latitude, lng: p.location.longitude })
        : undefined,
      openNow: p.currentOpeningHours?.openNow,
      hours: p.regularOpeningHours?.weekdayDescriptions,
      mapsUrl: p.googleMapsUri,
      inCrew: false,
      fetchedAt: now,
      createdAt: now,
    }));
}

/** The (up to five) Google reviews for one pro. */
export async function fetchReviews(placeId: string): Promise<Review[]> {
  const p = await g<GPlace>(`/places/${placeId}`, "id,reviews");
  return (p.reviews ?? [])
    .filter((r) => r.text?.text)
    .map((r) => ({
      author: r.authorAttribution?.displayName ?? "Google reviewer",
      rating: r.rating ?? 0,
      text: r.text!.text,
      when: r.relativePublishTimeDescription,
    }));
}
