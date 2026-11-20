# House records spike

Question: during onboarding, can we pull year built, what the house is made of, and permit history from public county and city sources?

Short answer: year built, size, lot, subdivision and last sale date come back free from Maricopa County with no key. Wall and roof type are not in that feed. Per-address permit history was not found on any open endpoint in the time I had.

Tested 2026-11-20 with curl, about 10 minutes.

## What works with no key

**Maricopa County Assessor, public ArcGIS parcels layer**

`https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0/query`

Query by point: `geometry=<lng>,<lat>&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=...&returnGeometry=false&f=json`

Useful fields: `APN_DASH` (parcel number), `CONST_YEAR` (year built), `LIVING_SPACE` (sq ft), `LAND_SIZE` (lot sq ft), `SUBNAME` (subdivision), `SALE_DATE`, `PHYSICAL_ADDRESS`, `JURISDICTION`, `PUC` (property use code).

Real result for a point near Scottsdale City Hall (-111.921, 33.497): parcel 173-52-005C, 4215 N Drinkwater Blvd, built 1992, lot 448,320 sq ft.

Things to know:
- A point that lands on a street returns nothing. The code retries with a 30 meter radius.
- `CONST_YEAR` and `LIVING_SPACE` are strings and are sometimes null (they were null for living space on the commercial parcel above).
- The layer also returns owner name and mailing address. We don't request or store those.
- No wall type, roof type, stories, heating/cooling or pool in this layer.

This is what the "Your house" feature uses.

## Needs a key

**Maricopa County Assessor API** (`https://mcassessor.maricopa.gov/`, documented under their API docs). It has residential detail the GIS layer lacks, by parcel number: wall type, roof type, stories, cooling, pool, improvements. It needs a token you request from the Assessor by email. Calls without one returned HTTP 500 for `/parcel/{apn}` and `/search/property/`. Not tested with a token. This is the next thing to get: we already store the parcel number, so it would slot straight in.

## Not found

**Permit history by address**
- City of Phoenix open data (CKAN, `https://www.phoenixopendata.com/api/3/action/package_search?q=permits`): the only permit dataset is yearly totals for the whole city (22 rows). Nothing per address.
- City of Phoenix public ArcGIS (`https://maps.phoenix.gov/pub/rest/services/Public`): reachable, lots of layers, no permit layer spotted in the listing I read. Only the first part of the list was checked.
- Scottsdale ArcGIS (`https://maps.scottsdaleaz.gov/arcgis/rest/services`): reachable. `Case_History` holds planning cases (use permits, zoning, plats), not building permits. `Accela` holds address points and parcels only. Other folders were not checked.
- Phoenix PDD permit search and Maricopa County permits are web search forms. No public JSON endpoint found. Not explored further.

So permits return an empty list today. The page and the data model are ready for them.

## Nationwide (not tested, from general knowledge)

Every county runs its own system with its own field names, so going county by county doesn't scale past a handful of metros.
- Assessor data: paid aggregators such as ATTOM, or Estated (now part of First American). One API, address in, year built and construction details out. Priced per call or by contract.
- Permits: BuildZoom or Shovels. They collect permits from thousands of city and county building departments. Coverage varies by city.

## Recommendation

1. Ship Maricopa now (done here) plus the form for what no record has.
2. Request the Maricopa Assessor API token for wall type, roof type and pool.
3. For permits and other counties, trial a paid source (Shovels for permits, ATTOM for assessor data) before building more county scrapers.
