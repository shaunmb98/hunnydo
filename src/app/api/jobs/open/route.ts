import { handler, HttpError, jobsCol, userDoc } from "@/lib/admin";
import { isBooked, openJobsCol } from "@/lib/biz-admin";
import type { OpenJob } from "@/lib/biz-types";
import type { Job, UserProfile } from "@/lib/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Put one of the caller's jobs on the job board, or take it off.
 * Shares the brief, photo, trade, urgency and city. The coordinates are rounded
 * to about half a mile so the board can sort by distance without placing the house.
 */
export const POST = handler<{ jobId?: string; open?: boolean }>(async ({ uid, body }) => {
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!/^[\w-]{4,200}$/.test(jobId)) throw new HttpError(400, "Which job?");
  const jobRef = jobsCol(uid).doc(jobId);
  const ref = openJobsCol().doc(jobId);
  const [jobSnap, userSnap, openSnap] = await Promise.all([jobRef.get(), userDoc(uid).get(), ref.get()]);
  const job = jobSnap.data() as Job | undefined;
  if (!job) throw new HttpError(404, "We couldn't find that job.");
  if (openSnap.exists && openSnap.data()?.ownerUid !== uid) throw new HttpError(403, "That job isn't yours.");

  // Best effort: a job that's been booked or finished comes off the board whatever was asked.
  if (isBooked(job)) {
    if (openSnap.exists) await ref.update({ status: "closed" });
    if (job.openToBids) await jobRef.update({ openToBids: false });
    return { open: false, closed: true };
  }

  if (!body.open) {
    await Promise.all([ref.delete(), jobRef.update({ openToBids: false })]);
    return { open: false };
  }

  const d = job.diagnosis;
  const home = (userSnap.data() as UserProfile | undefined)?.home;
  if (!d) throw new HttpError(409, "Wait for the diagnosis before opening this to bids.");
  if (!home) throw new HttpError(409, "Add your home address first so pros nearby can find the job.");

  const prev = openSnap.data() as OpenJob | undefined;
  const doc: OpenJob = {
    ownerUid: uid,
    jobId,
    title: d.title || job.title,
    trade: d.trade,
    urgency: d.urgency,
    brief: d.jobBrief,
    summary: d.summary,
    photoUrl: job.photoUrl,
    city: home.city ?? "",
    lat: round2(home.lat),
    lng: round2(home.lng),
    costLow: d.costLow,
    costHigh: d.costHigh,
    serviceFeeOk: !!job.serviceFeeOk,
    offerCount: prev?.offerCount ?? 0,
    status: "open",
    createdAt: prev?.createdAt ?? Date.now(),
  };
  await Promise.all([ref.set(doc), jobRef.update({ openToBids: true })]);
  return { open: true };
});
