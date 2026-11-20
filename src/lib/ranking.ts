import type { Pro, Urgency } from "./types";

// Pure ranking logic, shared by the pro directory and by job matching.
// The goal is "who is most likely to pick up, show up and do it right", not "who has the most stars".

const PRIOR_RATING = 4.2; // what we assume about a business before we see any reviews
const PRIOR_WEIGHT = 40; // how many reviews it takes to move halfway from the prior to the real rating

/** Rating adjusted for review count, so 5.0 from 6 reviews does not beat 4.8 from 900. */
export function adjustedRating(rating = 0, count = 0) {
  const unknown = PRIOR_RATING - 0.3; // no reviews at all: slightly below an average business
  if (!count) return unknown;
  const adjusted = (count * rating + PRIOR_WEIGHT * PRIOR_RATING) / (count + PRIOR_WEIGHT);
  // A handful of reviews shouldn't lift a business above one we know nothing about.
  return count < 5 ? Math.min(unknown, adjusted) : adjusted;
}

// "Open now" is a snapshot from when we last asked Google. Past this age we stop trusting it.
const OPEN_NOW_FRESH_MS = 90 * 60 * 1000;

export interface Scored {
  score: number; // 0-100
  reasons: string[]; // short, human-readable, most important first
  cautions: string[];
}

export function scorePro(pro: Pro, ctx: { urgency?: Urgency } = {}): Scored {
  const reasons: string[] = [];
  const cautions: string[] = [];
  const urgent = ctx.urgency === "emergency";

  // Quality: 0-45 points. 3.5 stars adjusted or lower earns nothing.
  // Someone you added by hand has no star rating. Treat them as an average pro, not an unknown one.
  const adj = pro.source === "manual" ? PRIOR_RATING + 0.3 : adjustedRating(pro.rating, pro.reviewCount);
  const quality = Math.max(0, Math.min(1, (adj - 3.5) / 1.4)) * 45;
  if (pro.rating && pro.reviewCount) {
    if (adj >= 4.6) reasons.push(`${pro.rating.toFixed(1)} stars across ${pro.reviewCount.toLocaleString()} reviews`);
    else if (pro.reviewCount < 15) cautions.push(`Only ${pro.reviewCount} reviews so far`);
    else if (pro.rating < 4.2) cautions.push(`${pro.rating.toFixed(1)} star average`);
  } else if (pro.source === "google") {
    cautions.push("No reviews yet");
  }

  // Responsiveness from review analysis: 0-25 points. Unknown gets a neutral 12.
  let responsiveness = 12;
  if (pro.responsiveness) {
    responsiveness = (pro.responsiveness.score / 100) * 25;
    if (pro.responsiveness.score >= 75) reasons.push("Reviews say they show up fast");
    if (pro.responsiveness.score <= 40) cautions.push("Reviews mention slow callbacks");
  }

  // Distance: 0-15 points, full marks within 3 miles, nothing past 25.
  let distance = 8;
  if (pro.distanceMi != null) {
    distance = Math.max(0, Math.min(1, (25 - pro.distanceMi) / 22)) * 15;
    if (pro.distanceMi <= 5) reasons.push(`${pro.distanceMi} mi away`);
    if (pro.distanceMi > 18) cautions.push(`${pro.distanceMi} mi away`);
  }

  // Reachable right now: worth more in an emergency.
  let reach = 0;
  const fresh = !!pro.fetchedAt && Date.now() - pro.fetchedAt < OPEN_NOW_FRESH_MS;
  const openNow = fresh ? pro.openNow : undefined;
  if (openNow) {
    reach += urgent ? 12 : 5;
    // Cards already show an open/closed badge. Only call it out as a reason when the job can't wait.
    if (urgent) reasons.push("Open right now");
  } else if (openNow === false && urgent) {
    cautions.push("Closed right now");
  }
  if (pro.phone) reach += 3;
  else cautions.push("No phone number listed");
  const is24h = pro.hours?.some((h) => /24 hours/i.test(h));
  if (is24h) {
    reach += urgent ? 4 : 1;
    reasons.push("24-hour service");
  }

  // People you already trust float to the top.
  let crew = 0;
  if (pro.inCrew) {
    crew = 8;
    reasons.unshift("In your crew");
  }

  const max = urgent ? 112 : 102;
  const score = Math.round(Math.min(100, ((quality + responsiveness + distance + reach + crew) / max) * 100));
  return { score, reasons: reasons.slice(0, 4), cautions: cautions.slice(0, 3) };
}

export function rankPros<T extends Pro>(pros: T[], ctx: { urgency?: Urgency } = {}) {
  return pros
    .map((pro) => ({ pro, ...scorePro(pro, ctx) }))
    .sort((a, b) => b.score - a.score || (b.pro.reviewCount ?? 0) - (a.pro.reviewCount ?? 0));
}
