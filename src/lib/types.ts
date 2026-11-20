// Shared data model. Firestore layout:
//   users/{uid}                       -> UserProfile
//   users/{uid}/pros/{proId}          -> Pro   (nearby pros cached from Google + manual entries; inCrew marks saved ones)
//   users/{uid}/jobs/{jobId}          -> Job
//   users/{uid}/jobs/{jobId}/bids/{proId} -> Bid

import type { HouseFacts, Permit } from "./house-types";

export type TradeId =
  // The eight looked up for every home at sign-up
  | "plumbing"
  | "electrical"
  | "hvac"
  | "roofing"
  | "appliance"
  | "handyman"
  | "pest"
  | "landscaping"
  // Looked up the first time a home needs them
  | "dryer_vent"
  | "garage_door"
  | "pool"
  | "locksmith"
  | "painting"
  | "flooring"
  | "windows"
  | "cleaning"
  | "carpet"
  | "chimney"
  | "gutters"
  | "tree"
  | "fencing"
  | "concrete"
  | "water_damage"
  | "septic"
  | "solar"
  | "junk"
  | "remodel";

export type Urgency = "emergency" | "soon" | "routine";

export interface Home {
  address: string;
  city?: string;
  placeId?: string;
  lat: number;
  lng: number;
}

export interface UserProfile {
  email: string;
  name?: string;
  home?: Home;
  onboardedAt?: number;
  prosFetchedAt?: number;
  emailUpdates?: boolean;
  house?: HouseFacts;
  housePermits?: Permit[];
  businessId?: string; // Google place id of the business this login has claimed (see biz-types.ts)
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  when?: string;
}

export interface Responsiveness {
  score: number; // 0-100: how likely they are to pick up, call back and show up
  verdict: string; // one sentence
  signals: string[]; // short quotes or paraphrases from reviews
  analyzedAt: number;
}

export interface Pro {
  id: string; // Google place id, or generated id for manual entries
  source: "google" | "manual";
  name: string;
  trade: TradeId;
  rating?: number;
  reviewCount?: number;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  lat?: number;
  lng?: number;
  distanceMi?: number;
  openNow?: boolean;
  hours?: string[];
  mapsUrl?: string;
  reviews?: Review[];
  responsiveness?: Responsiveness;
  inCrew: boolean;
  notes?: string;
  jobsCount?: number;
  fetchedAt?: number;
  createdAt: number;
}

export interface Diagnosis {
  title: string; // short name for the job, e.g. "Leaking main water line"
  summary: string; // plain-English explanation of what is going on
  likelyCause: string;
  trade: TradeId;
  urgency: Urgency;
  urgencyReason: string;
  confidence: "low" | "medium" | "high";
  photoObservations: string[];
  safetySteps: string[]; // what to do right now
  diyFeasible: boolean;
  diyNotes: string;
  costLow: number;
  costHigh: number;
  costNotes: string;
  questionsProsWillAsk: string[];
  termsToKnow: string[]; // vocabulary that helps on the phone, "term: meaning"
  jobBrief: string; // the describe-it-once write-up sent to every pro
  redFlags: string[]; // things to watch out for in quotes for this kind of job
}

export type JobStatus = "diagnosing" | "diagnosed" | "quoting" | "scheduled" | "done";

export interface Job {
  id: string;
  title: string;
  description: string;
  photoUrl?: string;
  photoPath?: string;
  status: JobStatus;
  trade?: TradeId;
  urgency?: Urgency;
  diagnosis?: Diagnosis;
  diagnosisError?: string;
  serviceFeeOk: boolean; // willing to pay a service-call / diagnostic fee
  maxServiceFee?: number;
  availability?: string; // when the homeowner is free
  hiredProId?: string;
  hiredProName?: string;
  hiredAmount?: number;
  scheduledFor?: string;
  bidCount?: number;
  quoteCount?: number;
  openToBids?: boolean; // posted to the job board for local pros
  createdAt: number;
  updatedAt: number;
}

export type BidStatus =
  | "drafted" // message written, not sent yet
  | "contacted" // homeowner reached out
  | "no_response"
  | "quoted"
  | "hired"
  | "declined";

export interface Quote {
  amountLow?: number;
  amountHigh?: number;
  serviceFee?: number;
  serviceFeeWaivedIfHired?: boolean;
  availability?: string;
  includes: string[];
  excludes: string[];
  warranty?: string;
  licensedInsured?: boolean;
  notes?: string;
  rawText?: string;
}

export interface BidEvent {
  at: number;
  text: string;
}

export interface Bid {
  id: string; // same as proId
  proId: string;
  proName: string;
  proPhone?: string;
  proEmail?: string;
  proWebsite?: string;
  proRating?: number;
  proReviewCount?: number;
  status: BidStatus;
  subject?: string;
  message?: string; // email / text body
  callScript?: string; // 20-second phone script
  quote?: Quote;
  followUpAt?: number;
  notes?: string;
  events: BidEvent[];
  source?: "board";
  claimVerified?: boolean; // board bids only: has the business proved it owns the listing? // set when the pro sent this bid through the job board
  createdAt: number;
  updatedAt: number;
}
