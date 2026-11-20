"use client";
import { CheckCircle2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, ErrorNote, ScoreDial, Spinner, Stars } from "@/components/ui";
import { api } from "@/lib/api-client";
import { cx } from "@/lib/format";
import type { BoardBid } from "@/lib/quotes-shared";
import { rankPros } from "@/lib/ranking";
import { trade as tradeInfo } from "@/lib/trades";
import type { Job, Pro } from "@/lib/types";
import { SectionTitle } from "./bits";

const FIRST_PAGE = 8;

/** Step 1: who to ask. Ranked pros for the job's trade, with checkboxes. */
export function Matches({
  job,
  pros,
  prosLoading,
  bids,
  onDrafted,
}: {
  job: Job;
  pros: Pro[];
  prosLoading: boolean;
  bids: BoardBid[];
  onDrafted?: () => void;
}) {
  const info = tradeInfo(job.trade ?? job.diagnosis?.trade);
  const ranked = useMemo(
    () => rankPros(pros.filter((p) => p.trade === info.id), { urgency: job.urgency }),
    [pros, info.id, job.urgency],
  );
  const onBoard = useMemo(() => new Set(bids.map((b) => b.id)), [bids]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [finding, setFinding] = useState(false);
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const [checkedNote, setCheckedNote] = useState("");
  const [error, setError] = useState("");

  // Preselect the top 3 you can actually call, once, the first time pros show up.
  const preselected = useRef(false);
  useEffect(() => {
    if (preselected.current || prosLoading || !ranked.length) return;
    preselected.current = true;
    if (bids.length) return;
    setPicked(new Set(ranked.filter((r) => r.pro.phone).slice(0, 3).map((r) => r.pro.id)));
  }, [ranked, prosLoading, bids.length]);

  const chosen = [...picked].filter((id) => !onBoard.has(id));
  const visible = showAll ? ranked : ranked.slice(0, FIRST_PAGE);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // "garage door techs", "plumbers": how you'd say it out loud.
  const who = /s$/i.test(info.pro) ? info.pro.toLowerCase() : `${info.pro.toLowerCase()}s`;

  async function findPros() {
    setFinding(true);
    setError("");
    try {
      const res = await api<{ count: number }>("/api/pros/refresh", { trade: info.id });
      if (!res.count) setError(`We didn't find any ${who} near your address. You can add one by hand from My crew.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't look up pros. Try again.");
    } finally {
      setFinding(false);
    }
  }

  async function checkShowUps() {
    const top = ranked.slice(0, 5).map((r) => r.pro.id);
    setChecking(new Set(top));
    setCheckedNote("");
    // Each call saves onto the pro doc, which re-ranks the list live. Failures stay quiet.
    const results = await Promise.allSettled(
      top.map((proId) =>
        api("/api/pros/analyze", { proId }).finally(() =>
          setChecking((prev) => {
            const next = new Set(prev);
            next.delete(proId);
            return next;
          }),
        ),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    setCheckedNote(
      ok === top.length
        ? `Read the reviews for the top ${ok}. The list is re-sorted.`
        : ok
          ? `Read the reviews for ${ok} of ${top.length}. The rest didn't have enough to go on.`
          : "Couldn't read the reviews just now. The ranking still uses stars, distance and hours.",
    );
  }

  async function draft() {
    if (!chosen.length) return;
    setDrafting(true);
    setError("");
    try {
      await api("/api/quotes/draft", { jobId: job.id, proIds: chosen });
      setPicked(new Set());
      onDrafted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't write the request. Try again.");
    } finally {
      setDrafting(false);
    }
  }

  // Services outside the core eight aren't looked up at sign-up, so look once on arrival.
  const looked = useRef(false);
  useEffect(() => {
    if (prosLoading || ranked.length || looked.current) return;
    looked.current = true;
    void findPros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prosLoading, ranked.length]);

  if (prosLoading) return <Spinner label="Finding your best matches" />;
  if (!ranked.length && finding) return <Spinner label={`Looking for ${who} near you`} />;

  if (!ranked.length) {
    return (
      <Card flat className="border-dashed px-6 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center text-ink-soft">
          <Search className="h-6 w-6" aria-hidden />
        </div>
        <h3 className="mt-4 text-xl font-bold">No {who} on your list yet</h3>
        <p className="mx-auto mt-1 max-w-md text-ink-soft">
          We&apos;ll look around your address and rank who&apos;s most likely to pick up and show up.
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={findPros} loading={finding}>
            Look for {who} near me
          </Button>
        </div>
        {error && <div className="mx-auto mt-4 max-w-md text-left"><ErrorNote>{error}</ErrorNote></div>}
      </Card>
    );
  }

  return (
    <div>
      <SectionTitle
        step={bids.length ? undefined : "Step 1"}
        title={bids.length ? "Ask a few more" : "Best matches"}
        sub="Ranked by who's most likely to pick up and show up. Stars are only part of it."
        action={
          <Button variant="outline" size="sm" onClick={checkShowUps} loading={checking.size > 0}>
            Check who shows up
          </Button>
        }
      />
      {checkedNote && <p className="mb-3 text-sm font-semibold text-ink-soft">{checkedNote}</p>}

      <ul className="space-y-3">
        {visible.map(({ pro, score, reasons, cautions }) => {
          const added = onBoard.has(pro.id);
          const on = picked.has(pro.id) && !added;
          return (
            <li key={pro.id}>
              <label
                className={cx(
                  "flex gap-3 rounded-md border border-line p-3 sm:p-4",
                  added ? "bg-paper" : "cursor-pointer bg-white",
                  on && "bg-honey-soft",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 accent-ink"
                  checked={on}
                  disabled={added}
                  onChange={() => toggle(pro.id)}
                  aria-label={`Ask ${pro.name} for a quote`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-display text-lg font-bold leading-tight">{pro.name}</p>
                    {added && (
                      <Badge tone="dark">
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> On your board
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                    <Stars rating={pro.rating} count={pro.reviewCount} />
                    {pro.distanceMi != null && (
                      <span className="inline-flex items-center gap-1">
                        {pro.distanceMi} mi
                      </span>
                    )}
                    {pro.openNow != null && (
                      <span className={cx("font-bold", pro.openNow ? "text-go" : "text-mute")}>
                        {pro.openNow ? "Open now" : "Closed now"}
                      </span>
                    )}
                    {checking.has(pro.id) && <span className=" font-semibold">Reading reviews</span>}
                  </div>
                  {reasons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {reasons.map((r) => (
                        <Badge key={r} tone={r === "In your crew" ? "honey" : "green"} className="whitespace-normal">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {pro.responsiveness?.verdict && (
                    <p className="mt-2 text-sm text-ink-soft">{pro.responsiveness.verdict}</p>
                  )}
                  {cautions.length > 0 && <p className="mt-1.5 text-xs text-mute">{cautions.join(" · ")}</p>}
                </div>
                <ScoreDial score={score} label="Match" />
              </label>
            </li>
          );
        })}
      </ul>

      {ranked.length > FIRST_PAGE && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 cursor-pointer text-sm font-bold underline underline-offset-4"
        >
          {showAll ? "Show fewer" : `Show ${ranked.length - FIRST_PAGE} more`}
        </button>
      )}

      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

      {/* Stays in reach while you scroll the list. On phones it sits above the tab bar. */}
      <div className="sticky bottom-20 z-10 mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line bg-white p-2 shadow-lift sm:p-3 md:bottom-4">
        <Button className="w-full sm:w-auto sm:px-6 sm:py-3.5 sm:text-lg" onClick={draft} loading={drafting} disabled={!chosen.length}>
          {drafting ? (
            "Writing it up"
          ) : chosen.length ? (
            <>
              <span className="sm:hidden">Write my request ({chosen.length})</span>
              <span className="hidden sm:inline">
                Write my quote request for {chosen.length} {chosen.length === 1 ? "pro" : "pros"}
              </span>
            </>
          ) : (
            "Pick who to ask"
          )}
        </Button>
        <p className="hidden min-w-0 flex-1 text-sm text-ink-soft sm:block">
          You send every message yourself. HunnyDo never contacts a business for you.
        </p>
      </div>
    </div>
  );
}
