import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { handler, HttpError, jobsCol, userDoc } from "@/lib/admin";
import { isBooked, openJobsCol } from "@/lib/biz-admin";
import type { OpenJob } from "@/lib/biz-types";
import { TRADE_IDS } from "@/lib/trades";
import type { Job, UserProfile } from "@/lib/types";

const BUCKET = "hunnydo-app.firebasestorage.app";
const boardPhoto = (jobId: string) => `board/${jobId}/photo.jpg`;

// Everything on the job doc is editable by its owner, so nothing is copied to the shared board unchecked.
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : 0);

/**
 * Copy the homeowner's photo to a board-only path and return a link to the copy.
 * The original lives under users/{uid}/..., and that path would hand the homeowner's id to every pro who saw it.
 */
async function publishPhoto(uid: string, jobId: string, photoPath?: string): Promise<string | undefined> {
  if (!photoPath || !photoPath.startsWith(`users/${uid}/`)) return undefined;
  try {
    const bucket = getStorage().bucket(BUCKET);
    const dest = bucket.file(boardPhoto(jobId));
    const token = randomUUID();
    await bucket.file(photoPath).copy(dest);
    await dest.setMetadata({ contentType: "image/jpeg", metadata: { firebaseStorageDownloadTokens: token } });
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(boardPhoto(jobId))}?alt=media&token=${token}`;
  } catch (err) {
    console.warn("[board] could not publish photo", err);
    return undefined;
  }
}

const unpublishPhoto = (jobId: string) =>
  getStorage().bucket(BUCKET).file(boardPhoto(jobId)).delete({ ignoreNotFound: true }).catch(() => {});

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
    if (openSnap.exists) await ref.update({ status: "closed", photoUrl: null });
    if (job.openToBids) await jobRef.update({ openToBids: false });
    await unpublishPhoto(jobId);
    return { open: false, closed: true };
  }

  if (!body.open) {
    // Close the post instead of deleting it: the id stays ours and the bid count survives a re-open.
    await Promise.all([
      openSnap.exists ? ref.update({ status: "closed", photoUrl: null }) : null,
      jobRef.update({ openToBids: false }),
      unpublishPhoto(jobId),
    ]);
    return { open: false };
  }

  const d = job.diagnosis;
  const home = (userSnap.data() as UserProfile | undefined)?.home;
  if (!d) throw new HttpError(409, "Wait for the diagnosis before opening this to bids.");
  if (!home) throw new HttpError(409, "Add your home address first so pros nearby can find the job.");

  if (!TRADE_IDS.includes(d.trade)) throw new HttpError(409, "This job doesn't have a trade yet. Re-check the diagnosis first.");
  if (!Number.isFinite(home.lat) || !Number.isFinite(home.lng) || Math.abs(home.lat) > 90 || Math.abs(home.lng) > 180) {
    throw new HttpError(409, "Your home address needs setting again before pros nearby can find the job.");
  }
  const urgency = d.urgency === "emergency" || d.urgency === "soon" ? d.urgency : "routine";

  const prev = openSnap.data() as OpenJob | undefined;
  const photoUrl = await publishPhoto(uid, jobId, job.photoPath);
  const doc: OpenJob = {
    ownerUid: uid,
    jobId,
    title: text(d.title, 140) || text(job.title, 140) || "Home repair job",
    trade: d.trade,
    urgency,
    brief: text(d.jobBrief, 4000),
    summary: text(d.summary, 1500),
    ...(photoUrl ? { photoUrl } : {}),
    city: text(home.city, 80),
    lat: round2(home.lat),
    lng: round2(home.lng),
    costLow: num(d.costLow, 1_000_000),
    costHigh: num(d.costHigh, 1_000_000),
    serviceFeeOk: !!job.serviceFeeOk,
    offerCount: prev?.offerCount ?? 0,
    status: "open",
    createdAt: prev?.createdAt ?? Date.now(),
  };
  await Promise.all([ref.set(doc), jobRef.update({ openToBids: true })]);
  return { open: true };
});
