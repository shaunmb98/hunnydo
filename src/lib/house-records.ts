import "server-only";
import type { HouseFacts, HouseLookup, Permit } from "./house-types";
import type { Home } from "./types";

// Public record lookups. Today: Maricopa County, AZ (Assessor's public ArcGIS parcels layer, no key).
// See docs/house-records-spike.md for what was tested and what isn't available.

const MARICOPA_PARCELS =
  "https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0/query";
const MARICOPA_NAME = "Maricopa County Assessor";
// Rough box around Maricopa County. The parcel query is the real test; this only saves a pointless call.
const MARICOPA_BOX = { minLat: 32.5, maxLat: 34.05, minLng: -113.35, maxLng: -111.03 };
// Only the fields we use. The layer also has owner names and mailing addresses; we don't ask for them.
const FIELDS = [
  "APN",
  "APN_DASH",
  "CONST_YEAR",
  "LIVING_SPACE",
  "LAND_SIZE",
  "SUBNAME",
  "SALE_DATE",
  "FLOOR",
].join(",");

type Attrs = Record<string, unknown>;

function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

function year(v: unknown): number | undefined {
  const m = String(v ?? "").match(/\b(1[89]\d\d|20\d\d)\b/);
  return m ? Number(m[1]) : undefined;
}

function text(v: unknown): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s || undefined;
}

/** GIS field names drift between counties and versions, so look a value up under a few names. */
function pick(a: Attrs, ...names: string[]): unknown {
  for (const n of names) {
    if (a[n] != null && a[n] !== "") return a[n];
    const hit = Object.keys(a).find((k) => k.toLowerCase() === n.toLowerCase());
    if (hit && a[hit] != null && a[hit] !== "") return a[hit];
  }
  return undefined;
}

async function queryParcel(lat: number, lng: number, radiusM?: number): Promise<Attrs | null> {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: FIELDS,
    returnGeometry: "false",
    f: "json",
  });
  if (radiusM) {
    params.set("distance", String(radiusM));
    params.set("units", "esriSRUnit_Meter");
  }
  const res = await fetch(`${MARICOPA_PARCELS}?${params}`, {
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) {
    console.warn("[house] Maricopa parcels returned", res.status);
    return null;
  }
  const data = (await res.json()) as { features?: { attributes?: Attrs }[]; error?: unknown };
  if (!Array.isArray(data.features)) {
    console.warn("[house] unexpected Maricopa response shape", JSON.stringify(data).slice(0, 300));
    return null;
  }
  // Prefer a parcel that has a building on it when the radius catches more than one.
  const rows = data.features.map((f) => f.attributes ?? {});
  return rows.find((a) => year(pick(a, "CONST_YEAR"))) ?? rows[0] ?? null;
}

function mapMaricopa(a: Attrs): HouseFacts {
  const facts: HouseFacts = {
    source: "county",
    sourceName: MARICOPA_NAME,
    fetchedAt: Date.now(),
    yearBuilt: year(pick(a, "CONST_YEAR", "CONSTRUCTION_YEAR", "YEAR_BUILT")),
    sqft: num(pick(a, "LIVING_SPACE", "LIVING_AREA", "SQFT")),
    lotSqft: num(pick(a, "LAND_SIZE", "LOT_SIZE")),
    parcelNumber: text(pick(a, "APN_DASH", "APN")),
    subdivision: text(pick(a, "SUBNAME", "SUBDIVISION")),
    lastSaleYear: year(pick(a, "SALE_DATE")),
  };
  if (!facts.yearBuilt && !facts.sqft && !facts.lotSqft) {
    console.warn("[house] parcel found but no known fields. Keys:", Object.keys(a).join(","));
  }
  return facts;
}

/** Look up public records for a home. Never throws; returns coverage "none" when we have nothing. */
export async function lookupHouse(home: Pick<Home, "lat" | "lng">): Promise<HouseLookup> {
  const none: HouseLookup = { facts: { source: "manual" }, permits: [], coverage: "none" };
  const { lat, lng } = home;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return none;
  const b = MARICOPA_BOX;
  if (lat < b.minLat || lat > b.maxLat || lng < b.minLng || lng > b.maxLng) return none;

  try {
    // Geocoded points sometimes land on the street or the curb, so widen the search once.
    const attrs = (await queryParcel(lat, lng)) ?? (await queryParcel(lat, lng, 12));
    if (!attrs) return none;
    // No open per-address permit source was found for Maricopa cities (see the spike doc).
    const permits: Permit[] = [];
    return { facts: mapMaricopa(attrs), permits, coverage: "county" };
  } catch (err) {
    console.warn("[house] lookup failed", err);
    return none;
  }
}
