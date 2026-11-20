// What we know about the house itself. Stored on the user doc:
//   users/{uid}.house        -> HouseFacts
//   users/{uid}.housePermits -> Permit[]

export interface HouseFacts {
  // From public records
  yearBuilt?: number;
  sqft?: number;
  lotSqft?: number;
  stories?: number;
  construction?: string; // wall type, e.g. "Block" or "Frame stucco"
  roofType?: string;
  heating?: string;
  cooling?: string;
  pool?: boolean;
  parcelNumber?: string;
  subdivision?: string;
  lastSaleYear?: number;
  source: "county" | "manual";
  sourceName?: string;
  fetchedAt?: number;
  // Typed in by the homeowner. County lookups never overwrite these.
  pipeMaterial?: string;
  waterHeaterYear?: number;
  hvacYear?: number;
  roofYear?: number;
  electricalPanel?: string; // brand and amps
  notes?: string;
}

export interface Permit {
  date?: string; // ISO date
  type?: string;
  description?: string;
  status?: string;
  number?: string;
}

export interface HouseLookup {
  facts: HouseFacts;
  permits: Permit[];
  coverage: "county" | "none";
}

/** Fields the homeowner fills in. A county refresh leaves them alone. */
export const HOMEOWNER_FIELDS = [
  "pipeMaterial",
  "waterHeaterYear",
  "hvacYear",
  "roofYear",
  "electricalPanel",
  "notes",
] as const satisfies readonly (keyof HouseFacts)[];

/** One-line summary, e.g. "Built 1998, 2,140 sq ft". Empty string if we know nothing. */
export function houseSummary(h?: Partial<HouseFacts> | null): string {
  if (!h) return "";
  const parts: string[] = [];
  if (h.yearBuilt) parts.push(`Built ${h.yearBuilt}`);
  if (h.sqft) parts.push(`${h.sqft.toLocaleString("en-US")} sq ft`);
  if (!parts.length && h.lotSqft) parts.push(`${h.lotSqft.toLocaleString("en-US")} sq ft lot`);
  return parts.join(", ");
}
