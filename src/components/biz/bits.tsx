"use client";
import { PhoneCall, ShieldQuestion } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { TradeIcon } from "@/components/TradeIcon";
import { Badge, Card } from "@/components/ui";
import { api } from "@/lib/api-client";
import { cx } from "@/lib/format";
import { TRADES } from "@/lib/trades";
import type { TradeId } from "@/lib/types";

/** Load something from one of the business routes, with a way to reload it. */
export function useBiz<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    return api<T>(path)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

export function TradePicker({ value, onChange }: { value: TradeId[]; onChange: (v: TradeId[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TRADES.map((t) => {
        const on = value.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== t.id) : [...value, t.id])}
            className={cx(
              "flex items-center gap-2 rounded-md border border-line px-3 py-2.5 text-left text-sm font-bold cursor-pointer",
              on ? "bg-honey" : "bg-white hover:bg-ink/5",
            )}
          >
            <TradeIcon trade={t.id} className="h-4 w-4 shrink-0" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Says plainly where ownership checks stand. Nothing here places a call. */
export function VerificationNote({ phone }: { phone?: string }) {
  return (
    <Card flat className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldQuestion className="h-5 w-5" aria-hidden />
        <p className="font-bold">Claimed, not yet verified</p>
        <Badge tone="amber">Verification coming soon</Badge>
      </div>
      <p className="text-sm text-ink-soft">
        Right now a claim is your word that this is your business. We haven't checked it, and homeowners see the listing
        as unverified.
      </p>
      <div className="flex gap-3 rounded-md border border-line bg-paper p-3 text-sm text-ink-soft">
        <PhoneCall className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          How it will work: we'll place an automated call to the number on your Google listing
          {phone ? ` (${phone})` : ""} and read out a short code. You type the code in here. Only someone who answers
          the business phone can do that. This step isn't built yet, so we won't call you today.
        </p>
      </div>
    </Card>
  );
}
