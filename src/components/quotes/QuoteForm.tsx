"use client";
import { updateDoc } from "firebase/firestore";
import { Wand2 } from "lucide-react";
import { useState } from "react";
import { Button, ErrorNote, Field, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/api-client";
import { bidRef, clean } from "@/lib/db";
import { lines, type BoardBid } from "@/lib/quotes-shared";
import type { Quote } from "@/lib/types";
import { Sheet } from "./bits";

type Tri = "" | "yes" | "no";
const toTri = (b?: boolean): Tri => (b == null ? "" : b ? "yes" : "no");
const fromTri = (t: Tri) => (t === "" ? undefined : t === "yes");
const num = (s: string) => {
  const n = Number(s.replace(/[$,\s]/g, ""));
  return s.trim() && Number.isFinite(n) && n >= 0 ? n : undefined;
};
const str = (n?: number) => (n == null ? "" : String(n));

function TriSelect({ value, onChange, yes, no }: { value: Tri; onChange: (v: Tri) => void; yes: string; no: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Tri)}
      className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-[15px] focus:outline-none focus:ring-4 focus:ring-honey/60"
    >
      <option value="">They didn&apos;t say</option>
      <option value="yes">{yes}</option>
      <option value="no">{no}</option>
    </select>
  );
}

/** Paste what the pro sent, check what we pulled out, save it to the bid. */
export function QuoteForm({ uid, jobId, bid, onClose }: { uid: string; jobId: string; bid: BoardBid; onClose: () => void }) {
  const q0 = bid.quote;
  const [raw, setRaw] = useState(q0?.rawText ?? "");
  const [showFields, setShowFields] = useState(!!q0);
  const [low, setLow] = useState(str(q0?.amountLow));
  const [high, setHigh] = useState(str(q0?.amountHigh));
  const [fee, setFee] = useState(str(q0?.serviceFee));
  const [credited, setCredited] = useState<Tri>(toTri(q0?.serviceFeeWaivedIfHired));
  const [availability, setAvailability] = useState(q0?.availability ?? "");
  const [includes, setIncludes] = useState((q0?.includes ?? []).join("\n"));
  const [excludes, setExcludes] = useState((q0?.excludes ?? []).join("\n"));
  const [warranty, setWarranty] = useState(q0?.warranty ?? "");
  const [licensed, setLicensed] = useState<Tri>(toTri(q0?.licensedInsured));
  const [notes, setNotes] = useState(q0?.notes ?? "");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function fill(q: Quote) {
    setLow(str(q.amountLow));
    setHigh(q.amountHigh !== q.amountLow ? str(q.amountHigh) : "");
    setFee(str(q.serviceFee));
    setCredited(toTri(q.serviceFeeWaivedIfHired));
    setAvailability(q.availability ?? "");
    setIncludes((q.includes ?? []).join("\n"));
    setExcludes((q.excludes ?? []).join("\n"));
    setWarranty(q.warranty ?? "");
    setLicensed(toTri(q.licensedInsured));
    setNotes(q.notes ?? "");
  }

  async function extract() {
    setReading(true);
    setError("");
    try {
      const { quote } = await api<{ quote: Quote }>("/api/quotes/extract", { text: raw });
      fill(quote);
      setShowFields(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that. You can fill in the fields by hand.");
      setShowFields(true);
    } finally {
      setReading(false);
    }
  }

  async function saveQuote() {
    const lo = num(low);
    const hi = num(high);
    const a = lo ?? hi;
    const b = hi ?? lo;
    const quote: Quote = {
      amountLow: a != null && b != null ? Math.min(a, b) : undefined,
      amountHigh: a != null && b != null ? Math.max(a, b) : undefined,
      serviceFee: num(fee),
      serviceFeeWaivedIfHired: fromTri(credited),
      availability: availability.trim() || undefined,
      includes: lines(includes),
      excludes: lines(excludes),
      warranty: warranty.trim() || undefined,
      licensedInsured: fromTri(licensed),
      notes: notes.trim() || undefined,
      rawText: raw.trim() || undefined,
    };
    if (quote.amountLow == null && !quote.availability && !quote.includes.length && !quote.notes) {
      setError("Add at least a price, a time or a note so there's something to compare.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const now = Date.now();
      const stays = bid.status === "hired" || bid.status === "quoted";
      await updateDoc(
        bidRef(uid, jobId, bid.id),
        clean({
          quote,
          status: bid.status === "hired" ? "hired" : "quoted",
          contactedAt: bid.contactedAt ?? now,
          updatedAt: now,
          events: [...(bid.events ?? []), { at: now, text: stays ? "Quote updated" : "Quote logged" }],
        }),
      );
      onClose();
    } catch {
      setError("That didn't save. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <Sheet title={`Quote from ${bid.proName}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Paste what they sent" hint="An email, a text, or your own notes from the call. Messy is fine.">
          <Textarea
            rows={5}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Looked at your pics. Probably 1800 to 2200 depending how deep it is. Trip charge is 89 but we take that off if you go with us. Can be out tomorrow morning."
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={extract} loading={reading} disabled={raw.trim().length < 8} variant={showFields ? "outline" : "primary"}>
            {!reading && <Wand2 className="h-4 w-4" aria-hidden />}
            {reading ? "Reading it" : showFields ? "Read it again" : "Pull out the details"}
          </Button>
          {!showFields && (
            <button type="button" onClick={() => setShowFields(true)} className="cursor-pointer text-sm font-bold underline underline-offset-4">
              I&apos;ll type it in myself
            </button>
          )}
        </div>
        <ErrorNote>{error}</ErrorNote>

        {showFields && (
          <div className="space-y-4 border-t border-dashed border-line pt-4">
            <p className="text-sm font-semibold text-ink-soft">Check these against what they told you, then save.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price from">
                <Input inputMode="decimal" placeholder="1800" value={low} onChange={(e) => setLow(e.target.value)} />
              </Field>
              <Field label="Up to" hint="Leave blank for one price">
                <Input inputMode="decimal" placeholder="2200" value={high} onChange={(e) => setHigh(e.target.value)} />
              </Field>
              <Field label="Service-call fee">
                <Input inputMode="decimal" placeholder="89" value={fee} onChange={(e) => setFee(e.target.value)} />
              </Field>
              <Field label="Fee comes off the bill?">
                <TriSelect value={credited} onChange={setCredited} yes="Yes, if I hire them" no="No, charged either way" />
              </Field>
            </div>
            <Field label="When they can come">
              <Input placeholder="Tomorrow between 8 and 10" value={availability} onChange={(e) => setAvailability(e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="What's included" hint="One per line">
                <Textarea rows={4} value={includes} onChange={(e) => setIncludes(e.target.value)} />
              </Field>
              <Field label="What's not" hint="One per line">
                <Textarea rows={4} value={excludes} onChange={(e) => setExcludes(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Warranty">
                <Input placeholder="1 year parts and labor" value={warranty} onChange={(e) => setWarranty(e.target.value)} />
              </Field>
              <Field label="Licensed and insured?">
                <TriSelect value={licensed} onChange={setLicensed} yes="Yes" no="No" />
              </Field>
            </div>
            <Field label="Anything else">
              <Textarea rows={2} className="min-h-0" placeholder="Wants half down on the day" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveQuote} loading={saving}>Save quote</Button>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
