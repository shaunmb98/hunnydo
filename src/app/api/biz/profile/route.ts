import { handler, HttpError } from "@/lib/admin";
import { amount, businessesCol, cleanTrades, requireBusiness, text } from "@/lib/biz-admin";

interface Body {
  about?: unknown;
  trades?: unknown;
  radiusMi?: unknown;
  serviceFee?: unknown;
  serviceFeeCredited?: unknown;
  licenseNumber?: unknown;
}

/** Read the caller's business, or save edits to it. An empty body just reads. */
export const POST = handler<Body>(async ({ uid, body }) => {
  const business = await requireBusiness(uid);
  if (!Object.keys(body).length) return { business };

  const trades = body.trades === undefined ? business.trades : cleanTrades(body.trades);
  if (!trades.length) throw new HttpError(400, "Pick at least one kind of work you do.");
  const fee = amount(body.serviceFee, 5000);
  const patch = {
    about: body.about === undefined ? business.about : text(body.about, 1200),
    trades,
    radiusMi: Math.min(100, Math.max(1, amount(body.radiusMi, 500) ?? business.radiusMi)),
    serviceFee: fee ?? null,
    serviceFeeCredited: !!body.serviceFeeCredited,
    licenseNumber: body.licenseNumber === undefined ? business.licenseNumber : text(body.licenseNumber, 60),
    updatedAt: Date.now(),
  };
  await businessesCol().doc(business.placeId).update(patch);
  return { business: { ...business, ...patch, serviceFee: fee } };
});
