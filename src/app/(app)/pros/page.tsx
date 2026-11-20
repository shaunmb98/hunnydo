"use client";
import { Phone, RotateCw, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Empty, TradeIcon } from "@/components/pros/TradeIcon";
import { useAuth } from "@/components/AuthProvider";
import { CrewButton } from "@/components/pros/CrewButton";
import { Badge, Button, Card, ErrorNote, Input, LinkButton, PageHeader, ScoreDial, Spinner, Stars } from "@/components/ui";
import { api } from "@/lib/api-client";
import { usePros } from "@/lib/db";
import { cx, timeAgo } from "@/lib/format";
import { plural, telHref } from "@/lib/pros-client";
import { rankPros } from "@/lib/ranking";
import { CORE_TRADES, MORE_TRADES, TRADES, TRADE_IDS, trade as tradeInfo } from "@/lib/trades";
import type { TradeId } from "@/lib/types";

type Sort = "match" | "rating" | "closest" | "reviews";
const SORTS: { id: Sort; label: string }[] = [
  { id: "match", label: "Best match" },
  { id: "rating", label: "Rating" },
  { id: "closest", label: "Closest" },
  { id: "reviews", label: "Most reviews" },
];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        "inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky/40",
        on ? "bg-honey" : "bg-white hover:bg-honey-soft",
      )}
    >
      {children}
    </button>
  );
}

function Directory() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("trade");
  const active: TradeId | "all" = TRADE_IDS.includes(raw as TradeId) ? (raw as TradeId) : "all";

  const { data: pros, loading } = usePros(user?.uid);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("match");
  const [openNow, setOpenNow] = useState(false);
  const [crewOnly, setCrewOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of pros) c[p.trade] = (c[p.trade] ?? 0) + 1;
    return c;
  }, [pros]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rankPros(
      pros.filter(
        (p) =>
          (active === "all" || p.trade === active) &&
          (!needle || p.name.toLowerCase().includes(needle)) &&
          (!openNow || p.openNow) &&
          (!crewOnly || p.inCrew),
      ),
    );
    if (sort === "rating") list.sort((a, b) => (b.pro.rating ?? 0) - (a.pro.rating ?? 0) || (b.pro.reviewCount ?? 0) - (a.pro.reviewCount ?? 0));
    if (sort === "closest") list.sort((a, b) => (a.pro.distanceMi ?? 999) - (b.pro.distanceMi ?? 999));
    if (sort === "reviews") list.sort((a, b) => (b.pro.reviewCount ?? 0) - (a.pro.reviewCount ?? 0));
    return list;
  }, [pros, active, q, sort, openNow, crewOnly]);

  // Services outside the core eight aren't looked up at sign-up. Fetch one the first time it's opened.
  const tried = useRef(new Set<string>());
  useEffect(() => {
    if (loading || active === "all" || counts[active] || tried.current.has(active)) return;
    tried.current.add(active);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, active, counts]);

  function pick(t: TradeId | "all") {
    setNote("");
    setError("");
    router.replace(t === "all" ? "/pros" : `/pros?trade=${t}`, { scroll: false });
  }

  async function refresh() {
    // "All" refreshes the core trades plus any others this home has already looked up.
    const ids = active === "all" ? TRADES.filter((t) => t.core || counts[t.id]).map((t) => t.id) : [active];
    setRefreshing(true);
    setError("");
    setNote("");
    const results = await Promise.allSettled(ids.map((id) => api<{ count: number }>("/api/pros/refresh", { trade: id })));
    const ok = results.filter((r) => r.status === "fulfilled");
    const total = ok.reduce((n, r) => n + (r.status === "fulfilled" ? r.value.count : 0), 0);
    if (!ok.length) {
      const first = results[0];
      setError(first.status === "rejected" && first.reason instanceof Error ? first.reason.message : "Couldn't refresh. Try again.");
    } else {
      setNote(
        `Checked Google just now: ${plural(total, "pro")} nearby.` +
          (ok.length < ids.length ? ` ${ids.length - ok.length} trades didn't load, try again in a bit.` : ""),
      );
    }
    setRefreshing(false);
  }

  const t = active === "all" ? null : tradeInfo(active);
  const filtered = !!q.trim() || openNow || crewOnly;

  return (
    <>
      <PageHeader
        title="Find pros"
        subtitle={
          <>
            Local pros near {profile?.home?.city ?? "home"}, ranked by who&apos;s most likely to pick up and show up.
            {profile?.prosFetchedAt ? ` Last checked ${timeAgo(profile.prosFetchedAt)}.` : ""}
          </>
        }
        action={
          <Button variant="outline" onClick={refresh} loading={refreshing}>
            {!refreshing && <RotateCw className="h-4 w-4" aria-hidden />}
            {t ? `Refresh ${t.label.toLowerCase()}` : "Refresh all trades"}
          </Button>
        }
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Trade">
        <Chip on={active === "all"} onClick={() => pick("all")}>
          All <span className="font-medium text-ink-soft">{pros.length}</span>
        </Chip>
        {TRADES.filter((tr) => tr.core || counts[tr.id] || active === tr.id).map((tr) => (
          <Chip key={tr.id} on={active === tr.id} onClick={() => pick(tr.id)}>
            <TradeIcon id={tr.id} /> {tr.label}{" "}
            <span className="font-medium text-ink-soft">{counts[tr.id] ?? 0}</span>
          </Chip>
        ))}
        <select
          aria-label="More services"
          value=""
          onChange={(e) => e.target.value && pick(e.target.value as TradeId)}
          className="shrink-0 cursor-pointer rounded-full border border-line bg-white px-3 py-1.5 text-sm font-bold"
        >
          <option value="">More services</option>
          {MORE_TRADES.filter((tr) => !counts[tr.id] && active !== tr.id).map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" aria-label="Search by name" className="pl-10" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-bold">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-honey/60"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <Chip on={openNow} onClick={() => setOpenNow(!openNow)}>
            Open now
          </Chip>
          <Chip on={crewOnly} onClick={() => setCrewOnly(!crewOnly)}>
            In my crew
          </Chip>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <ErrorNote>{error}</ErrorNote>
        {note && <p className="text-sm font-semibold text-go" role="status">{note}</p>}
      </div>

      <div className="mt-4">
        {loading ? (
          <Spinner label="Rounding up the pros" />
        ) : shown.length === 0 ? (
          filtered ? (
            <Empty
              icon={<Search className="h-7 w-7" />}
              title="Nobody matches that"
              body="Loosen the search or switch off a filter and they'll come back."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setOpenNow(false);
                    setCrewOnly(false);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <Empty
              icon={t ? <TradeIcon id={t.id} className="h-7 w-7" /> : <Search className="h-7 w-7" />}
              title={t ? `No ${t.label.toLowerCase()} pros saved yet` : "No pros here yet"}
              body="We haven't scouted this one near your home. One press and we'll pull the closest twenty from Google."
              action={
                <Button onClick={refresh} loading={refreshing}>
                  {t ? `Find ${t.label.toLowerCase()} pros near me` : "Scout my neighborhood"}
                </Button>
              }
            />
          )
        ) : (
          <>
            <p className="mb-3 text-sm font-semibold text-ink-soft">
              {plural(shown.length, "pro")}
              {t ? ` in ${t.label.toLowerCase()}` : ""}
            </p>
            <ul className="grid gap-4 lg:grid-cols-2">
              {shown.map(({ pro, score, reasons, cautions }) => {
                const tr = tradeInfo(pro.trade);
                return (
                  <li key={pro.id}>
                    <Card className="flex h-full flex-col p-4">
                      <div className="flex items-start gap-3">
                        <ScoreDial score={score} label="Match" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/pros/${pro.id}`} className="block text-lg font-bold leading-tight hover:underline">
                            {pro.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                            <span>
                              <TradeIcon id={tr.id} /> {tr.pro}
                            </span>
                            <Stars rating={pro.rating} count={pro.reviewCount} />
                            {pro.distanceMi != null && <span>{pro.distanceMi} mi</span>}
                            {pro.openNow != null && <Badge tone={pro.openNow ? "green" : "neutral"}>{pro.openNow ? "Open now" : "Closed"}</Badge>}
                          </div>
                        </div>
                      </div>
                      {reasons.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {reasons.map((r) => (
                            <Badge key={r} tone={r === "In your crew" ? "dark" : "honey"} className="whitespace-normal">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {cautions.length > 0 && <p className="mt-2 text-sm text-mute">Heads up: {cautions.join(" · ")}</p>}
                      <div className="mt-auto flex flex-wrap gap-2 pt-4">
                        {pro.phone && (
                          <LinkButton href={telHref(pro.phone)} size="sm" variant="outline">
                            <Phone className="h-4 w-4" aria-hidden /> Call
                          </LinkButton>
                        )}
                        {pro.website && (
                          <LinkButton href={pro.website} size="sm" variant="outline" external>
Website
                          </LinkButton>
                        )}
                        {user && <CrewButton uid={user.uid} proId={pro.id} inCrew={!!pro.inCrew} />}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

export default function ProsPage() {
  return (
    <Suspense fallback={<Spinner label="Rounding up the pros" />}>
      <Directory />
    </Suspense>
  );
}
