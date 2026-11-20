"use client";
import { useState } from "react";
import { Button, ErrorNote, Field, Input } from "@/components/ui";
import { api } from "@/lib/api-client";
import { moneyRange } from "@/lib/format";
import type { BoardBid } from "@/lib/quotes-shared";
import { Sheet } from "./bits";

/** Last check before booking: agreed price and when they're coming. */
export function HireSheet({
  jobId,
  bid,
  openCount,
  onClose,
  onHired,
}: {
  jobId: string;
  bid: BoardBid;
  openCount: number; // other pros still in play, who will be marked as passed
  onClose: () => void;
  onHired: (emailed: boolean) => void;
}) {
  const q = bid.quote;
  const single = q?.amountLow != null && q.amountLow === q.amountHigh;
  const [amount, setAmount] = useState(single ? String(q!.amountLow) : "");
  const [when, setWhen] = useState(q?.availability ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function hire() {
    setBusy(true);
    setError("");
    try {
      const n = Number(amount.replace(/[$,\s]/g, ""));
      const res = await api<{ ok: boolean; emailed: boolean }>("/api/quotes/hire", {
        jobId,
        proId: bid.id,
        scheduledFor: when.trim() || undefined,
        amount: amount.trim() && Number.isFinite(n) && n > 0 ? n : undefined,
      });
      onHired(res.emailed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't book that. Try again.");
      setBusy(false);
    }
  }

  return (
    <Sheet title={`Go with ${bid.proName}?`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-ink-soft">
          Make sure you&apos;ve told them yourself. HunnyDo doesn&apos;t contact them. This marks the job as booked, adds
          them to your crew and emails you the details.
          {openCount > 0 && ` The other ${openCount === 1 ? "pro" : `${openCount} pros`} on your board will be marked as passed.`}
        </p>
        <Field
          label="Agreed price"
          hint={!single && q?.amountLow != null ? `They quoted ${moneyRange(q.amountLow, q.amountHigh)}. Leave blank if it isn't settled.` : undefined}
        >
          <Input inputMode="decimal" placeholder="2000" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="When are they coming?">
          <Input placeholder="Thursday between 8 and 10" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex flex-wrap gap-2">
          <Button onClick={hire} loading={busy}>Yes, book it</Button>
          <Button variant="ghost" onClick={onClose}>Not yet</Button>
        </div>
      </div>
    </Sheet>
  );
}
