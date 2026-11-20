import { FieldValue } from "firebase-admin/firestore";
import { HttpError, adminDb, bidsCol, handler, jobsCol, prosCol } from "@/lib/admin";
import { loadBids, loadJob, loadPro } from "@/lib/quotes-server";

/**
 * POST /api/quotes/unhire {jobId} -> {ok}
 * Booked the wrong pro? Put the job back to collecting quotes.
 * Bids that were passed over only because of the booking come back as quotes (or contacted, if they never quoted).
 */
export const POST = handler<{ jobId?: string }>(async ({ uid, body }) => {
  const job = await loadJob(uid, body.jobId);
  if (!job.hiredProId) throw new HttpError(409, "Nobody is booked for this job.");
  const hiredId = job.hiredProId;
  const [bids, pro] = await Promise.all([loadBids(uid, job.id), loadPro(uid, hiredId)]);
  const now = Date.now();

  const batch = adminDb.batch();
  for (const bid of bids) {
    const passedByBooking = bid.status === "declined" && bid.events?.some((e) => e.text.startsWith("Passed: went with"));
    if (bid.id !== hiredId && !passedByBooking) continue;
    batch.update(bidsCol(uid, job.id).doc(bid.id), {
      status: bid.quote ? "quoted" : "contacted",
      updatedAt: now,
      events: FieldValue.arrayUnion({ at: now, text: bid.id === hiredId ? "Booking undone" : "Back in the running" }),
    });
  }
  batch.update(jobsCol(uid).doc(job.id), {
    status: "quoting",
    hiredProId: FieldValue.delete(),
    hiredProName: FieldValue.delete(),
    hiredAmount: FieldValue.delete(),
    scheduledFor: FieldValue.delete(),
    updatedAt: now,
  });
  // They stay in the crew (the homeowner can remove them), but this job no longer counts toward their history.
  if (pro?.jobsCount) batch.update(prosCol(uid).doc(hiredId), { jobsCount: FieldValue.increment(-1) });
  await batch.commit();
  return { ok: true };
});
