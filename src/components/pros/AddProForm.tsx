"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button, ErrorNote, Field, Input, Textarea } from "@/components/ui";
import { addManualPro } from "@/lib/pros-client";
import { TRADES } from "@/lib/trades";
import type { Pro, TradeId } from "@/lib/types";

const selectCls =
  "w-full rounded-xl border-2 border-ink bg-white px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-4 focus:ring-honey/60";

/** Add someone you already trust. `compact` shows just name, trade and phone. */
export function AddProForm({
  uid,
  compact,
  defaultTrade = "plumbing",
  onAdded,
}: {
  uid: string;
  compact?: boolean;
  defaultTrade?: TradeId;
  onAdded?: (pro: Pro) => void;
}) {
  const [name, setName] = useState("");
  const [trade, setTrade] = useState<TradeId>(defaultTrade);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give them a name so you can find them later.");
    setBusy(true);
    setError("");
    try {
      const pro = await addManualPro(uid, { name, trade, phone, email, notes });
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
      onAdded?.(pro);
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className={compact ? "grid gap-3 sm:grid-cols-3" : "grid gap-3 sm:grid-cols-2"}>
        <Field label="Name or business">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dave the plumber" autoComplete="off" />
        </Field>
        <Field label="What they do">
          <select className={selectCls} value={trade} onChange={(e) => setTrade(e.target.value as TradeId)}>
            {TRADES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Phone">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(602) 555-0142" autoComplete="off" />
        </Field>
        {!compact && (
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dave@example.com" autoComplete="off" />
          </Field>
        )}
      </div>
      {!compact && (
        <Field label="Notes" hint="Only you can see these.">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Fixed the water heater in 2023. Fair price, text him first." />
        </Field>
      )}
      <ErrorNote>{error}</ErrorNote>
      <Button type="submit" variant={compact ? "outline" : "primary"} loading={busy}>
        {!busy && <Plus className="h-4 w-4" aria-hidden />} Add to my crew
      </Button>
    </form>
  );
}
