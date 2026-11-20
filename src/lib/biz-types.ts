// The pro side of the market. Firestore layout (server-only, see firestore.rules):
//   businesses/{placeId}                 -> Business (one owner per Google listing)
//   businesses/{placeId}/offers/{jobId}  -> Offer    (the pro's own record of what they bid)
//   openJobs/{jobId}                     -> OpenJob  (what a homeowner agreed to share with local pros)

import type { TradeId, Urgency } from "./types";

export interface Verification {
  method: "phone";
  status: "pending" | "verified";
}

export interface Business {
  ownerUid: string;
  placeId: string;
  name: string;
  phone?: string;
  website?: string;
  address?: string;
  lat: number;
  lng: number;
  rating?: number;
  reviewCount?: number;
  trades: TradeId[];
  radiusMi: number;
  about: string;
  serviceFee?: number;
  serviceFeeCredited: boolean;
  licenseNumber: string;
  verified: boolean;
  verification: Verification;
  createdAt: number;
  updatedAt?: number;
}

/** A Google listing a pro can claim. */
export interface Listing {
  placeId: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  lat?: number;
  lng?: number;
}

export interface OpenJob {
  ownerUid: string;
  jobId: string;
  title: string;
  trade: TradeId;
  urgency: Urgency;
  brief: string;
  summary: string;
  photoUrl?: string;
  city: string;
  lat: number; // rounded to 2 decimals, never the exact home
  lng: number;
  costLow: number;
  costHigh: number;
  serviceFeeOk: boolean;
  offerCount: number;
  status: "open" | "closed";
  createdAt: number;
}

export interface OfferInput {
  jobId: string;
  amountLow: number;
  amountHigh: number;
  serviceFee?: number;
  serviceFeeCredited: boolean;
  availability: string;
  includes: string;
  warranty: string;
  notes: string;
}

export interface Offer extends OfferInput {
  ownerUid: string;
  title: string;
  trade: TradeId;
  city: string;
  createdAt: number;
  updatedAt: number;
}

/** What a pro sees on the job board. No owner id, no street address. */
export type BoardJob = Omit<OpenJob, "ownerUid" | "lat" | "lng"> & {
  distanceMi: number;
  myOffer?: Omit<Offer, "ownerUid">;
};

export type OfferStatus = "waiting" | "hired" | "passed";
export type OfferRow = Omit<Offer, "ownerUid"> & { status: OfferStatus };
