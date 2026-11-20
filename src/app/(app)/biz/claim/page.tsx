"use client";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TradePicker, VerificationNote } from "@/components/biz/bits";
import { Badge, Button, Card, ErrorNote, Field, Input, LinkButton, PageHeader, Stars } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { Listing } from "@/lib/biz-types";
import { cx } from "@/lib/format";
import type { TradeId } from "@/lib/types";

type Found = Listing & { claimed?: "you" | "other" };

export default function ClaimPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Found[] | null>(null);
  const [picked, setPicked] = useState<Found | null>(null);
  const [trades, setTrades] = useState<TradeId[]>([]);
  const [radius, setRadius] = useState("15");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (profile?.businessId) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title="Your business is claimed" subtitle="You can start bidding on jobs nearby." />
        <VerificationNote />
        <LinkButton href="/biz">Go to the job board</LinkButton>
      </div>
    );
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setPicked(null);
    try {
      setResults((await api<{ listings: Found[] }>("/api/biz/search", { query })).listings);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function claim() {
    if (!picked) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/biz/claim", { placeId: picked.placeId, trades, radiusMi: Number(radius) });
      router.replace("/biz");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Claim your business"
        subtitle="Find your Google listing. Homeowners nearby post jobs with a full write-up, and you bid on the ones you want."
      />
      <Card className="space-y-4 p-5">
        <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Business name and city">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Desert Sun Plumbing, Scottsdale" />
            </Field>
          </div>
          <Button type="submit" loading={busy && !picked} disabled={query.trim().length < 3}>
            <Search className="h-4 w-4" aria-hidden /> Search
          </Button>
        </form>
        {results && results.length === 0 && (
          <p className="text-sm text-ink-soft">Nothing came up. Try the name exactly as it shows on Google, plus the city.</p>
        )}
        {results && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((l) => (
              <li key={l.placeId}>
                <button
                  type="button"
                  disabled={l.claimed === "other"}
                  onClick={() => setPicked(l)}
                  className={cx(
                    "w-full rounded-md border border-line px-4 py-3 text-left",
                    l.claimed === "other" ? "cursor-not-allowed bg-paper opacity-60" : "cursor-pointer",
                    picked?.placeId === l.placeId ? "bg-honey-soft" : "bg-white",
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{l.name}</span>
                    <Stars rating={l.rating} count={l.reviewCount} />
                    {l.claimed === "other" && <Badge>Already claimed</Badge>}
                  </span>
                  <span className="block text-sm text-ink-soft">{l.address}</span>
                  {l.phone && <span className="block text-sm text-ink-soft">{l.phone}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {picked && (
        <Card className="space-y-5 p-5">
          <h2 className="text-xl font-bold">Set up {picked.name}</h2>
          <div>
            <p className="mb-1.5 text-sm font-bold">What kind of work do you do?</p>
            <TradePicker value={trades} onChange={setTrades} />
          </div>
          <div className="max-w-[220px]">
            <Field label="How far will you drive?" hint="Miles from your business address">
              <Input type="number" min={1} max={100} value={radius} onChange={(e) => setRadius(e.target.value)} />
            </Field>
          </div>
          <VerificationNote phone={picked.phone} />
          <Button onClick={claim} loading={busy} disabled={!trades.length}>
            This is my business
          </Button>
        </Card>
      )}
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}
