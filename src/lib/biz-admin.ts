import "server-only";
import { adminDb, HttpError, userDoc } from "./admin";
import type { Business } from "./biz-types";
import { TRADE_IDS } from "./trades";
import type { TradeId } from "./types";

export const businessesCol = () => adminDb.collection("businesses");
export const openJobsCol = () => adminDb.collection("openJobs");
export const offersCol = (placeId: string) => businessesCol().doc(placeId).collection("offers");

/** The business this user owns, or a 404 that sends them to the claim screen. */
export async function requireBusiness(uid: string): Promise<Business> {
  const user = (await userDoc(uid).get()).data();
  const id = typeof user?.businessId === "string" ? user.businessId : "";
  if (!id) throw new HttpError(404, "Claim your business first.");
  const snap = await businessesCol().doc(id).get();
  const biz = snap.data() as Business | undefined;
  if (!biz || biz.ownerUid !== uid) throw new HttpError(403, "That business belongs to another account.");
  return biz;
}

export function cleanTrades(v: unknown): TradeId[] {
  if (!Array.isArray(v)) return [];
  return TRADE_IDS.filter((t) => v.includes(t));
}

export const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** A dollar amount or mileage from the browser: finite, not negative, capped. Undefined when blank. */
export function amount(v: unknown, max = 1_000_000): number | undefined {
  if (v === "" || v == null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new HttpError(400, "One of those numbers doesn't look right.");
  return Math.round(n * 100) / 100;
}

export const isBooked = (job?: { status?: string; hiredProId?: string }) =>
  !job || !!job.hiredProId || job.status === "scheduled" || job.status === "done";
