"use client";
import { setDoc, updateDoc } from "firebase/firestore";
import { clean, proRef } from "./db";
import type { Pro, TradeId } from "./types";

// Client-side writes for the pro directory and the crew list.

export const setCrew = (uid: string, proId: string, inCrew: boolean) =>
  updateDoc(proRef(uid, proId), { inCrew });

export const saveNotes = (uid: string, proId: string, notes: string) =>
  updateDoc(proRef(uid, proId), { notes });

export interface ManualProInput {
  name: string;
  trade: TradeId;
  phone?: string;
  email?: string;
  notes?: string;
}

/** Add someone the homeowner already trusts. Goes straight into the crew. */
export async function addManualPro(uid: string, input: ManualProInput): Promise<Pro> {
  const id = crypto.randomUUID();
  const pro: Pro = clean({
    id,
    source: "manual" as const,
    name: input.name.trim(),
    trade: input.trade,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    inCrew: true,
    createdAt: Date.now(),
  });
  await setDoc(proRef(uid, id), pro);
  return pro;
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
