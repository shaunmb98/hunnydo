import { bidsCol, handler, jobsCol } from "@/lib/admin";
import { offersCol, requireBusiness } from "@/lib/biz-admin";
import type { Offer, OfferRow, OfferStatus } from "@/lib/biz-types";

/** Every bid this business has sent, with where it stands on the homeowner's board. */
export const POST = handler(async ({ uid }) => {
  const business = await requireBusiness(uid);
  const snap = await offersCol(business.placeId).orderBy("updatedAt", "desc").limit(100).get();
  const offers: OfferRow[] = await Promise.all(
    snap.docs.map(async (d) => {
      const { ownerUid, ...offer } = d.data() as Offer;
      const [bid, job] = await Promise.all([
        bidsCol(ownerUid, offer.jobId).doc(business.placeId).get(),
        jobsCol(ownerUid).doc(offer.jobId).get(),
      ]);
      const bidStatus = bid.data()?.status;
      const hiredId = job.data()?.hiredProId;
      let status: OfferStatus = "waiting";
      if (bidStatus === "hired" || hiredId === business.placeId) status = "hired";
      else if (!bid.exists || !job.exists || bidStatus === "declined" || hiredId) status = "passed";
      return { ...offer, status };
    }),
  );
  return { offers };
});
