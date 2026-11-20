import { HttpError, adminDb, bidsCol, handler, jobsCol, prosCol } from "@/lib/admin";
import { structured } from "@/lib/ai";
import { DraftSchema, PLAIN_VOICE, feePreference, loadBids, loadJob, loadProfile } from "@/lib/quotes-server";
import { fillPro, type BoardBid } from "@/lib/quotes-shared";
import { trade } from "@/lib/trades";
import type { Pro } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM = `You write a homeowner's message to local tradespeople asking for a quote. The homeowner sends it themselves from their own phone or email, as their own words, to a busy plumber or electrician who reads it between jobs.

${PLAIN_VOICE}

Write ONE version that works for any business. Wherever the business name belongs, write the literal placeholder {{pro}}. Never invent facts that aren't in the brief. Don't include a phone number or street address.

- subject: under 70 characters, just says what the job is.
- message: 120-180 words in two or three short paragraphs. Start with "Hi {{pro}}," then say what's wrong using the brief, say when I'm around, and ask in plain sentences for a rough price or range, the soonest they could come out, whether they charge a service-call fee and if it comes off the bill when I hire them, and whether they're licensed and insured. Say I can send photos.
- textMessage: under 260 characters. The same ask boiled down for a text. Starts with "Hi {{pro}}".
- callScript: about 20 seconds out loud (50-65 words), one paragraph, the way a person actually talks on the phone. Works when someone picks up or as a voicemail. Ends by asking them to call or text back with a rough price and when they could come out. Write [your number] where the callback number goes.`;

/** POST /api/quotes/draft {jobId, proIds} -> writes one drafted bid per pro, returns {created, skipped, bidCount}. */
export const POST = handler<{ jobId?: string; proIds?: string[] }>(async ({ uid, body }) => {
  const job = await loadJob(uid, body.jobId);
  if (!job.diagnosis) throw new HttpError(409, "This job needs a diagnosis before we can write the request.");
  const proIds = [...new Set((Array.isArray(body.proIds) ? body.proIds : []).filter((x) => typeof x === "string" && x))];
  if (!proIds.length) throw new HttpError(400, "Pick at least one pro.");
  if (proIds.length > 12) throw new HttpError(400, "That's a lot of pros at once. Pick 12 or fewer.");

  const [profile, existing, proSnaps] = await Promise.all([
    loadProfile(uid),
    loadBids(uid, job.id),
    adminDb.getAll(...proIds.map((id) => prosCol(uid).doc(id))),
  ]);
  const have = new Set(existing.map((b) => b.id));
  const pros = proSnaps.filter((s) => s.exists).map((s) => ({ ...(s.data() as Pro), id: s.id }));
  if (!pros.length) throw new HttpError(404, "We couldn't find those pros.");
  const fresh = pros.filter((p) => !have.has(p.id));
  if (!fresh.length) return { created: 0, skipped: pros.length, bidCount: existing.length };

  const dx = job.diagnosis;
  const firstName = profile?.name?.trim().split(/\s+/)[0];
  const draft = await structured({
    system: SYSTEM,
    schema: DraftSchema,
    effort: "low",
    maxTokens: 2000,
    prompt: [
      `Job: ${dx.title} (${trade(job.trade ?? dx.trade).label})`,
      `Brief to work from:\n${dx.jobBrief}`,
      `Urgency: ${job.urgency ?? dx.urgency}. ${dx.urgencyReason}`,
      `Home is in: ${profile?.home?.city ?? "not given, leave the city out"}`,
      `When I'm available: ${job.availability?.trim() || "flexible, not specified"}`,
      `Service-call fee: ${feePreference(job)}`,
      `My first name: ${firstName ?? "not given"}`,
    ].join("\n\n"),
  });

  const now = Date.now();
  const batch = adminDb.batch();
  for (const pro of fresh) {
    const bid: BoardBid = {
      id: pro.id,
      proId: pro.id,
      proName: pro.name,
      proPhone: pro.phone,
      proEmail: pro.email,
      proWebsite: pro.website,
      proRating: pro.rating,
      proReviewCount: pro.reviewCount,
      status: "drafted",
      subject: fillPro(draft.subject, pro.name),
      message: fillPro(draft.message, pro.name),
      textMessage: fillPro(draft.textMessage, pro.name),
      callScript: fillPro(draft.callScript, pro.name),
      events: [{ at: now, text: "Request written" }],
      createdAt: now,
      updatedAt: now,
    };
    // create() fails if the doc appeared in the meantime, so a bid is never overwritten.
    batch.create(bidsCol(uid, job.id).doc(pro.id), bid);
  }
  const bidCount = existing.length + fresh.length;
  batch.update(jobsCol(uid).doc(job.id), {
    bidCount,
    updatedAt: now,
    ...(job.status === "diagnosed" || job.status === "diagnosing" ? { status: "quoting" } : {}),
  });
  await batch.commit();
  return { created: fresh.length, skipped: pros.length - fresh.length, bidCount };
});
