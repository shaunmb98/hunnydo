import { FieldValue } from "firebase-admin/firestore";
import { adminDb, bidsCol, handler, HttpError, jobsCol, prosCol } from "@/lib/admin";
import { amount, isBooked, offersCol, openJobsCol, requireBusiness, text } from "@/lib/biz-admin";
import type { Offer, OpenJob } from "@/lib/biz-types";
import { milesBetween } from "@/lib/places";
import type { Bid, Pro, Quote } from "@/lib/types";

type Body = Record<string, unknown>;

/** Send (or update) this business's bid on an open job. It lands on the homeowner's quote board as a normal quoted bid. */
export const POST = handler<Body>(async ({ uid, body }) => {
  const business = await requireBusiness(uid);
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!/^[\w-]{4,200}$/.test(jobId)) throw new HttpError(400, "Which job?");

  const amountLow = amount(body.amountLow);
  const amountHigh = amount(body.amountHigh) ?? amountLow;
  if (!amountLow || !amountHigh) throw new HttpError(400, "Add your price. A range is fine.");
  if (amountHigh < amountLow) throw new HttpError(400, "The high end of your price is below the low end.");
  const serviceFee = amount(body.serviceFee, 5000);
  const input = {
    amountLow,
    amountHigh,
    serviceFee,
    serviceFeeCredited: !!body.serviceFeeCredited,
    availability: text(body.availability, 200),
    includes: text(body.includes, 1000),
    warranty: text(body.warranty, 300),
    notes: text(body.notes, 1500),
  };
  if (!input.availability) throw new HttpError(400, "Say when you could get out there.");

  const openRef = openJobsCol().doc(jobId);
  const open = (await openRef.get()).data() as OpenJob | undefined;
  if (!open || open.status !== "open") throw new HttpError(404, "This job isn't taking bids any more.");
  if (open.ownerUid === uid) throw new HttpError(403, "You can't bid on your own job.");
  if (!business.trades.includes(open.trade)) throw new HttpError(403, "This job is outside the trades on your business profile.");
  if (milesBetween(business, open) > business.radiusMi) throw new HttpError(403, "This job is outside your service area.");

  const owner = open.ownerUid;
  const placeId = business.placeId;
  const jobRef = jobsCol(owner).doc(jobId);
  const bidRef = bidsCol(owner, jobId).doc(placeId);
  const proRef = prosCol(owner).doc(placeId);
  const offerRef = offersCol(placeId).doc(jobId);
  const now = Date.now();

  const quote: Quote = {
    amountLow,
    amountHigh,
    serviceFee,
    serviceFeeWaivedIfHired: input.serviceFeeCredited,
    availability: input.availability,
    includes: input.includes.split(/\n|;/).map((s) => s.trim()).filter(Boolean),
    excludes: [],
    warranty: input.warranty || undefined,
    // A typed-in license number is self-reported, so it does not count as verified licensing.
    licensedInsured: undefined,
    notes: input.notes || undefined,
  };

  const updated = await adminDb.runTransaction(async (tx) => {
    const [jobSnap, bidSnap, proSnap, offerSnap] = await Promise.all([tx.get(jobRef), tx.get(bidRef), tx.get(proRef), tx.get(offerRef)]);
    if (isBooked(jobSnap.data())) {
      tx.update(openRef, { status: "closed" });
      return null;
    }
    const prev = bidSnap.data() as Bid | undefined;
    if (prev && (prev.status === "hired" || prev.status === "declined")) {
      throw new HttpError(409, "The homeowner has already decided on this one.");
    }
    // If the homeowner already reached out to this business on their own, that thread is theirs. Don't replace it.
    if (prev && prev.source !== "board") {
      throw new HttpError(409, "This homeowner is already talking to your business directly, so there's no need to bid here.");
    }
    const hadQuote = !!prev?.quote;
    const bid: Bid = {
      ...(prev ?? {}),
      id: placeId,
      proId: placeId,
      proName: business.name,
      proPhone: business.phone,
      proWebsite: business.website,
      proRating: business.rating,
      proReviewCount: business.reviewCount,
      status: "quoted",
      quote,
      source: "board",
      claimVerified: business.verified === true,
      events: [...(prev?.events ?? []), { at: now, text: prev ? "Bid updated from the job board" : "Bid came in from the job board" }],
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
    tx.set(bidRef, bid);
    if (!proSnap.exists) {
      const pro: Pro = {
        id: placeId,
        source: "google",
        name: business.name,
        trade: open.trade,
        rating: business.rating,
        reviewCount: business.reviewCount,
        phone: business.phone,
        website: business.website,
        address: business.address,
        lat: business.lat,
        lng: business.lng,
        inCrew: false,
        createdAt: now,
      };
      tx.set(proRef, pro);
    }
    if (!prev || !hadQuote) {
      tx.update(jobRef, {
        ...(prev ? {} : { bidCount: FieldValue.increment(1) }),
        quoteCount: FieldValue.increment(1),
        updatedAt: now,
      });
    }
    if (!offerSnap.exists) tx.update(openRef, { offerCount: FieldValue.increment(1) });
    const offer: Offer = {
      jobId,
      ...input,
      ownerUid: owner,
      title: open.title,
      trade: open.trade,
      city: open.city,
      createdAt: (offerSnap.data() as Offer | undefined)?.createdAt ?? now,
      updatedAt: now,
    };
    tx.set(offerRef, offer);
    return !!prev;
  });

  if (updated === null) throw new HttpError(409, "The homeowner just booked someone for this job.");
  return { ok: true, updated };
});
