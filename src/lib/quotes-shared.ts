import type { Tone } from "@/components/ui";
import type { Bid, BidStatus, Diagnosis, Quote } from "./types";

// Pure helpers for the quote board. Safe to import from client and server code.

/** A bid as the quote board stores it: the shared Bid plus a couple of board-only fields. */
export type BoardBid = Bid & {
  textMessage?: string; // short version for SMS
  contactedAt?: number; // when the homeowner first said they reached out
};

export interface Advice {
  pick: string; // proId
  why: string;
  tradeoffs: string[];
  questionsToAsk: string[];
}

export const STATUS_ORDER: BidStatus[] = ["hired", "quoted", "contacted", "drafted", "no_response", "declined"];

export const STATUS_META: Record<BidStatus, { label: string; group: string; tone: Tone }> = {
  drafted: { label: "Ready to send", group: "Ready to send", tone: "honey" },
  contacted: { label: "Waiting to hear back", group: "Waiting to hear back", tone: "blue" },
  quoted: { label: "Quote in", group: "Quotes in", tone: "green" },
  no_response: { label: "No answer", group: "No answer yet", tone: "amber" },
  hired: { label: "Hired", group: "Hired", tone: "dark" },
  declined: { label: "Passed", group: "Passed on", tone: "neutral" },
};

export const DAY = 24 * 60 * 60 * 1000;

export const digits = (phone: string) => phone.replace(/[^\d+]/g, "");
export const telHref = (phone: string) => `tel:${digits(phone)}`;
/** "?&body=" is the form both iOS and Android accept. */
export const smsHref = (phone: string, body: string) => `sms:${digits(phone)}?&body=${encodeURIComponent(body)}`;
export const mailtoHref = (email: string, subject: string, body: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const fillPro = (text: string, proName: string) => text.replace(/\{\{\s*pro\s*\}\}/gi, proName);

/** A contacted bid that has sat for a day without a quote. */
export function needsFollowUp(bid: BoardBid, now = Date.now()) {
  if (bid.status !== "contacted" || bid.quote) return false;
  return now - (bid.contactedAt ?? bid.updatedAt) > DAY;
}

export function followUpNote(bid: BoardBid, jobTitle: string) {
  return `Hi ${bid.proName}, following up on my message about ${jobTitle.toLowerCase()}. Are you able to take a look and give me a rough quote? If you're booked up, no problem, just let me know. Thanks!`;
}

export function thanksNote(bid: BoardBid, jobTitle: string) {
  return `Hi ${bid.proName}, thanks for getting back to me about ${jobTitle.toLowerCase()}. I've decided to go with another company for this one, but I appreciate your time and I'll keep your number for next time.`;
}

/** The number to compare a quote by: the middle of the range, or whichever end we have. */
export function quoteMid(q?: Quote) {
  if (!q) return undefined;
  const { amountLow: lo, amountHigh: hi } = q;
  if (lo != null && hi != null) return (lo + hi) / 2;
  return lo ?? hi;
}

export interface PriceVerdict {
  tone: Tone;
  label: string;
  detail: string;
}

/** How a quote sits against the diagnosis estimate. */
export function priceVerdict(q: Quote | undefined, dx?: Pick<Diagnosis, "costLow" | "costHigh">): PriceVerdict | null {
  const mid = quoteMid(q);
  if (mid == null || !dx || !dx.costHigh) return null;
  const lo = q?.amountLow ?? mid;
  const hi = q?.amountHigh ?? mid;
  if (lo > dx.costHigh * 1.3)
    return { tone: "red", label: "Well above estimate", detail: "More than 30% over the top of what this job usually runs. Ask what's driving it." };
  if (mid > dx.costHigh)
    return { tone: "amber", label: "Above estimate", detail: "A bit over the usual range. Could be fair if it includes more." };
  if (hi < dx.costLow * 0.6)
    return { tone: "amber", label: "Suspiciously low", detail: "Far under the usual range. Check what's left out before you say yes." };
  if (mid < dx.costLow)
    return { tone: "blue", label: "Below estimate", detail: "Under the usual range. Confirm it covers the whole job." };
  return { tone: "green", label: "In the expected range", detail: "Lines up with what this job usually costs." };
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Rough "how many days out" from free text like "tomorrow morning", "Thursday", "next week", "11/24".
 * Returns null when we can't tell, so we never hand out a "Soonest" badge on a guess.
 */
export function daysOut(text?: string, now = new Date()): number | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\b(today|tonight|same[- ]day|right away|right now|asap|within the hour|this (morning|afternoon|evening))\b/.test(t)) return 0;
  if (/\b(tomorrow|tmrw|next[- ]day)\b/.test(t)) return 1;
  const inDays = t.match(/\b(\d+)\s*(?:-\s*\d+\s*)?(business |working )?days?\b/);
  if (inDays) return Number(inDays[1]);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const toDays = (d: Date) => {
    let diff = Math.round((d.getTime() - start) / DAY);
    if (diff < -30) diff += 365; // a date that already passed this year means next year
    return diff >= 0 ? diff : null;
  };
  const named = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/);
  if (named) return toDays(new Date(now.getFullYear(), MONTHS.indexOf(named[1]), Number(named[2])));
  const slash = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (slash && Number(slash[1]) <= 12 && Number(slash[2]) <= 31)
    return toDays(new Date(now.getFullYear(), Number(slash[1]) - 1, Number(slash[2])));
  const wd = WEEKDAYS.findIndex((d) => t.includes(d) || new RegExp(`\\b${d.slice(0, 3)}s?\\b`).test(t));
  if (wd >= 0) {
    let diff = (wd - now.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    if (/\bnext\b/.test(t) && diff < 7) diff += 7;
    return diff;
  }
  if (/\bthis week\b/.test(t)) return 3;
  if (/\bnext week\b/.test(t)) return 7;
  const weeks = t.match(/\b(\d+)\s*(?:-\s*\d+\s*)?weeks?\b/);
  if (weeks) return Number(weeks[1]) * 7;
  if (/\b(a|one) week\b/.test(t)) return 7;
  if (/\b(a couple|couple of) weeks\b/.test(t)) return 14;
  return null;
}

export interface CompareBadge {
  tone: Tone;
  label: string;
}

/** "Lowest price", "Soonest" and friends. Only awarded when there is something to compare against. */
export function compareBadges(bids: BoardBid[], now = new Date()): Record<string, CompareBadge[]> {
  const out: Record<string, CompareBadge[]> = Object.fromEntries(bids.map((b) => [b.id, []]));
  if (bids.length < 2) return out;
  const award = (score: (b: BoardBid) => number | null | undefined, pick: "min" | "max", badge: CompareBadge) => {
    const scored = bids.map((b) => ({ id: b.id, v: score(b) })).filter((s): s is { id: string; v: number } => s.v != null);
    if (scored.length < 2) return;
    const best = pick === "min" ? Math.min(...scored.map((s) => s.v)) : Math.max(...scored.map((s) => s.v));
    const winners = scored.filter((s) => s.v === best);
    if (winners.length === 1) out[winners[0].id].push(badge);
  };
  award((b) => quoteMid(b.quote), "min", { tone: "green", label: "Lowest price" });
  award((b) => daysOut(b.quote?.availability, now), "min", { tone: "blue", label: "Soonest" });
  award((b) => (b.proReviewCount ? b.proRating : null), "max", { tone: "honey", label: "Best rated" });
  return out;
}

export const lines = (s: string) => s.split("\n").map((l) => l.replace(/^[-*•\s]+/, "").trim()).filter(Boolean);
