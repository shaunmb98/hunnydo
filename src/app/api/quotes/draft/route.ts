import { HttpError, adminDb, bidsCol, handler, jobsCol, prosCol } from "@/lib/admin";
import { structured } from "@/lib/ai";
import { DraftSchema, feePreference, loadBids, loadJob, loadProfile } from "@/lib/quotes-server";
import { fillPro, type BoardBid } from "@/lib/quotes-shared";
import { trade } from "@/lib/trades";
import type { Pro } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM = `You write short outreach for a homeowner who needs a home-service pro. The homeowner will send it themselves from their own phone or email, so it must read like a real person wrote it: first person, plain, polite, specific, no marketing language, no emoji, no mention of AI or any app.

Write ONE version that works for any business. Wherever the business name belongs, write the literal placeholder {{pro}}. Never invent facts that aren't in the brief. Don't include a phone number or street address. Sign off with the homeowner's first name if you're given one, otherwise just "Thanks".

- subject: under 70 characters, says what the job is.
- message: 120-180 words. Open with "Hi {{pro}}," then describe the problem using the brief, say when the homeowner is around, and ask for: a rough quote or price range, their earliest availability, whether they charge a service-call fee and if it's credited toward the work, and whether they're licensed and insured. Mention photos are available if they'd help.
- textMessage: under 260 characters. The same ask, boiled down for a text. Starts with "Hi {{pro}}".
- callScript: about 20 seconds spoken (50-65 words). Something to say when someone picks up or to leave as a voicemail. Natural speech, one short paragraph, ends by asking for a callback or text with a rough price and when they could come out. Use [your number] where the callback number goes.`;

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
