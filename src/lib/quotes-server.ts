import "server-only";
import { z } from "zod";
import { HttpError, bidsCol, jobsCol, prosCol, userDoc } from "./admin";
import type { BoardBid } from "./quotes-shared";
import type { Job, Pro, Quote, UserProfile } from "./types";

export const DraftSchema = z.object({
  subject: z.string().describe("Email subject line, under 70 characters, names the job"),
  message: z.string().describe("Email body, 120-180 words, first person, uses {{pro}} for the business name"),
  textMessage: z.string().describe("SMS version, under 260 characters, uses {{pro}} for the business name"),
  callScript: z.string().describe("What to say out loud in about 20 seconds when someone picks up, or as a voicemail"),
});

export const ExtractSchema = z.object({
  amountLow: z.number().nullable().describe("Low end of the quoted price for the work in dollars, null if no price was given"),
  amountHigh: z.number().nullable().describe("High end in dollars. Same as amountLow for a single price. null if no price"),
  serviceFee: z.number().nullable().describe("Service-call / trip / diagnostic fee in dollars. 0 if they said it's free, null if not mentioned"),
  serviceFeeWaivedIfHired: z.boolean().nullable().describe("true if the fee is waived or credited toward the work when hired, false if charged regardless, null if not said"),
  availability: z.string().nullable().describe("When they can come out or start, in their words, short. null if not mentioned"),
  includes: z.array(z.string()).describe("What the price covers, short items"),
  excludes: z.array(z.string()).describe("What is explicitly not covered or costs extra, short items"),
  warranty: z.string().nullable().describe("Warranty or guarantee terms, null if not mentioned"),
  licensedInsured: z.boolean().nullable().describe("true if they say they are licensed and/or insured, false if they say they are not, null if not mentioned"),
  notes: z.string().nullable().describe("Anything else worth remembering: payment terms, deposits, conditions, caveats. null if nothing"),
});

export const AdviceSchema = z.object({
  pick: z.string().describe("The proId of the pro you would lean toward"),
  why: z.string().describe("2-3 plain sentences on why, spoken to the homeowner"),
  tradeoffs: z.array(z.string()).describe("2-4 honest tradeoffs or reasons someone might choose differently"),
  questionsToAsk: z.array(z.string()).describe("2-4 specific questions to ask before saying yes"),
});

/** Turn the model's nulls into absent fields so the Quote matches the shared type. */
export function toQuote(x: z.infer<typeof ExtractSchema>, rawText?: string): Quote {
  const q: Quote = { includes: x.includes ?? [], excludes: x.excludes ?? [] };
  if (x.amountLow != null) q.amountLow = x.amountLow;
  if (x.amountHigh != null) q.amountHigh = x.amountHigh;
  if (q.amountLow == null && q.amountHigh != null) q.amountLow = q.amountHigh;
  if (q.amountHigh == null && q.amountLow != null) q.amountHigh = q.amountLow;
  if (q.amountLow != null && q.amountHigh != null && q.amountLow > q.amountHigh)
    [q.amountLow, q.amountHigh] = [q.amountHigh, q.amountLow];
  if (x.serviceFee != null) q.serviceFee = x.serviceFee;
  if (x.serviceFeeWaivedIfHired != null) q.serviceFeeWaivedIfHired = x.serviceFeeWaivedIfHired;
  if (x.availability) q.availability = x.availability;
  if (x.warranty) q.warranty = x.warranty;
  if (x.licensedInsured != null) q.licensedInsured = x.licensedInsured;
  if (x.notes) q.notes = x.notes;
  if (rawText) q.rawText = rawText;
  return q;
}

export async function loadJob(uid: string, jobId: unknown): Promise<Job> {
  if (typeof jobId !== "string" || !jobId) throw new HttpError(400, "Which job is this for?");
  const snap = await jobsCol(uid).doc(jobId).get();
  if (!snap.exists) throw new HttpError(404, "We couldn't find that job.");
  return { ...(snap.data() as Job), id: snap.id };
}

export async function loadProfile(uid: string): Promise<UserProfile | null> {
  const snap = await userDoc(uid).get();
  return snap.exists ? (snap.data() as UserProfile) : null;
}

export async function loadBids(uid: string, jobId: string): Promise<BoardBid[]> {
  const snap = await bidsCol(uid, jobId).get();
  return snap.docs.map((d) => ({ ...(d.data() as BoardBid), id: d.id, proId: d.id }));
}

export async function loadPro(uid: string, proId: string): Promise<Pro | null> {
  const snap = await prosCol(uid).doc(proId).get();
  return snap.exists ? { ...(snap.data() as Pro), id: snap.id } : null;
}

export function feePreference(job: Job) {
  if (!job.serviceFeeOk) return "I'd rather not pay a service-call or diagnostic fee just for someone to come look. Ask plainly whether they charge one.";
  if (job.maxServiceFee) return `I'm fine paying a service-call fee up to about $${job.maxServiceFee}, ideally credited toward the work if I hire them.`;
  return "I'm fine paying a reasonable service-call fee, ideally credited toward the work if I hire them.";
}

/** Voice rules for anything Claude writes that a person will read or send as their own words. */
export const PLAIN_VOICE = `Voice rules, follow all of them:
- Sound like a neighbor typed it on their phone. First person, short plain sentences, contractions, specific details.
- No em dashes, no semicolons, no bullet points or lists inside a message, no exclamation marks, no emoji.
- No stock politeness: never "I hope this message finds you well", "I would greatly appreciate", "at your earliest convenience", "please don't hesitate", "thank you in advance".
- No "not just X but Y", no strings of three adjectives, no words like seamless, effortless, elevate, unlock, streamline, robust, leverage, ensure, utilize.
- No sign-off flourish. End on the ask, then a plain "Thanks" and the first name if you have one.
- Never mention AI, an app or an assistant.`;
