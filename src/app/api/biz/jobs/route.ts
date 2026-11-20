import { handler, jobsCol } from "@/lib/admin";
import { isBooked, offersCol, openJobsCol, requireBusiness } from "@/lib/biz-admin";
import type { BoardJob, Offer, OpenJob } from "@/lib/biz-types";
import { milesBetween } from "@/lib/places";

/** The job board: open jobs in this business's trades, inside its service radius. */
export const POST = handler(async ({ uid }) => {
  const business = await requireBusiness(uid);
  const [openSnap, offerSnap] = await Promise.all([
    openJobsCol().where("status", "==", "open").limit(300).get(),
    offersCol(business.placeId).get(),
  ]);
  const mine = new Map(offerSnap.docs.map((d) => [d.id, d.data() as Offer]));

  const near = openSnap.docs
    .map((d) => d.data() as OpenJob)
    .filter((j) => j.ownerUid !== uid && business.trades.includes(j.trade))
    .map((j) => ({ j, distanceMi: milesBetween(business, j) }))
    .filter((x) => x.distanceMi <= business.radiusMi);

  // The hire flow doesn't know about the board, so check the real job and close stale posts here.
  const live = await Promise.all(
    near.map(async (x) => {
      const job = (await jobsCol(x.j.ownerUid).doc(x.j.jobId).get()).data();
      if (!isBooked(job)) return x;
      await openJobsCol().doc(x.j.jobId).update({ status: "closed" }).catch(() => {});
      return null;
    }),
  );

  const jobs: BoardJob[] = live
    .filter((x) => x !== null)
    .map(({ j, distanceMi }) => {
      const { ownerUid: _owner, lat: _lat, lng: _lng, ...shared } = j;
      const offer = mine.get(j.jobId);
      let myOffer: BoardJob["myOffer"];
      if (offer) {
        const { ownerUid: _o, ...rest } = offer;
        myOffer = rest;
      }
      return { ...shared, distanceMi, myOffer };
    })
    .sort((a, b) => Number(b.urgency === "emergency") - Number(a.urgency === "emergency") || b.createdAt - a.createdAt);

  return { business, jobs };
});
