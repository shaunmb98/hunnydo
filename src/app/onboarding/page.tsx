"use client";
import { setDoc } from "firebase/firestore";
import { ArrowRight, Check, Loader2, MapPin, RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { TradeIcon } from "@/components/pros/TradeIcon";
import { useAuth } from "@/components/AuthProvider";
import { AddProForm } from "@/components/pros/AddProForm";
import { Badge, Button, Card, ErrorNote, LinkButton, Logo, ScoreDial, Spinner, Stars } from "@/components/ui";
import { api } from "@/lib/api-client";
import { usePros, userRef } from "@/lib/db";
import { cx } from "@/lib/format";
import { plural } from "@/lib/pros-client";
import { rankPros } from "@/lib/ranking";
import { TRADES } from "@/lib/trades";
import type { Home, TradeId } from "@/lib/types";

type Step = 1 | 2 | 3;
type Suggestion = { placeId: string; text: string };
type Scout = { state: "waiting" | "looking" | "done" | "failed"; count?: number };

const STEPS = ["Where's home?", "Scouting", "Sorted"];

function Progress({ step }: { step: Step }) {
  return (
    <ol className="flex items-center" aria-label={`Step ${step} of 3`}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className={cx("flex items-center", i > 0 && "flex-1")} aria-current={current ? "step" : undefined}>
            {i > 0 && <span className={cx("mx-2 h-1 flex-1 rounded-full border border-ink", done || current ? "bg-honey" : "bg-white")} />}
            <span className="flex items-center gap-2">
              <span
                className={cx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink font-display text-base font-extrabold",
                  done ? "bg-ink text-white" : current ? "bg-honey shadow-hard-sm" : "bg-white text-mute",
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : n}
              </span>
              <span className={cx("hidden text-sm font-bold sm:inline", !current && !done && "text-mute")}>{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Step 1: address box with live suggestions. */
function AddressStep({ onPick }: { onPick: (s: Suggestion) => void }) {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const seq = useRef(0);
  const listId = useId();

  useEffect(() => {
    const q = input.trim();
    if (q.length < 3) {
      seq.current++;
      setItems([]);
      setBusy(false);
      setSearched(false);
      return;
    }
    const mine = ++seq.current;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const { suggestions } = await api<{ suggestions: Suggestion[] }>("/api/places/autocomplete", { input: q });
        if (mine !== seq.current) return;
        setItems(suggestions.slice(0, 5));
        setActive(suggestions.length ? 0 : -1);
        setOpen(true);
        setSearched(true);
        setError("");
      } catch (err) {
        if (mine !== seq.current) return;
        setItems([]);
        setError(err instanceof Error ? err.message : "Couldn't look that up.");
      } finally {
        if (mine === seq.current) setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [input]);

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = items[active] ?? items[0];
      if (open && pick) onPick(pick);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const show = open && items.length > 0;
  return (
    <div className="pop">
      <h1 className="text-4xl font-extrabold sm:text-5xl">
        Where&apos;s <span className="marker">home?</span>
      </h1>
      <p className="mt-3 text-lg text-ink-soft">
        Give us the address and we&apos;ll line up the plumbers, electricians and everyone else nearby, sorted by who
        actually shows up.
      </p>

      <div className="relative mt-6">
        <label htmlFor="home-address" className="mb-1.5 block text-sm font-bold">
          Home address
        </label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" aria-hidden />
          <input
            id="home-address"
            role="combobox"
            aria-expanded={show}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Start typing your street address"
            className="w-full rounded-xl border-2 border-ink bg-white py-3.5 pl-11 pr-11 text-lg shadow-hard-sm placeholder:text-mute focus:outline-none focus:ring-4 focus:ring-honey/60"
          />
          {busy && <Loader2 className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-mute" aria-hidden />}
        </div>

        <ul
          id={listId}
          role="listbox"
          aria-label="Address suggestions"
          className={cx(
            "absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border-2 border-ink bg-white shadow-hard",
            !show && "hidden",
          )}
        >
          {items.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(s);
              }}
              className={cx(
                "flex cursor-pointer items-center gap-3 border-b border-line px-4 py-3 text-[15px] font-semibold last:border-b-0",
                i === active && "bg-honey-soft",
              )}
            >
              <MapPin className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
              <span className="min-w-0 break-words">{s.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-mute" aria-live="polite">
          {error
            ? ""
            : searched && !busy && !items.length
              ? "No match yet. Keep typing, with the house number and street."
              : show
                ? "Pick your address from the list."
                : "We only use this to find pros near you."}
        </p>
        <div className="mt-2">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </div>
    </div>
  );
}

/** Step 2: save the home, then scout all eight trades at once. */
function ScoutStep({
  placeId,
  home,
  onHome,
  onDone,
  onBack,
}: {
  placeId?: string;
  home?: Home;
  onHome: (h: Home) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<Record<string, Scout>>(() =>
    Object.fromEntries(TRADES.map((t) => [t.id, { state: "waiting" }])),
  );
  const [homeError, setHomeError] = useState("");
  const [finished, setFinished] = useState(false);
  const started = useRef(false);

  const scout = useCallback(async (ids: TradeId[]) => {
    setFinished(false);
    setRows((r) => ({ ...r, ...Object.fromEntries(ids.map((id) => [id, { state: "looking" }])) }));
    await Promise.all(
      ids.map(async (id) => {
        try {
          const { count } = await api<{ count: number }>("/api/pros/refresh", { trade: id });
          setRows((r) => ({ ...r, [id]: { state: "done", count } }));
        } catch {
          setRows((r) => ({ ...r, [id]: { state: "failed" } }));
        }
      }),
    );
    setFinished(true);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      if (!home) {
        try {
          const res = await api<{ home: Home }>("/api/home", { placeId });
          onHome(res.home);
        } catch (err) {
          setHomeError(err instanceof Error ? err.message : "Couldn't save that address.");
          return;
        }
      }
      await scout(TRADES.map((t) => t.id));
    })();
  }, [home, placeId, onHome, scout]);

  const list = Object.values(rows);
  const total = list.reduce((n, r) => n + (r.count ?? 0), 0);
  const failed = TRADES.filter((t) => rows[t.id].state === "failed").map((t) => t.id);
  const settled = list.filter((r) => r.state === "done" || r.state === "failed").length;
  const anyGood = list.some((r) => r.state === "done");

  // Everything came back clean: move along on our own after a beat.
  useEffect(() => {
    if (!finished || failed.length || !anyGood) return;
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, [finished, failed.length, anyGood, onDone]);

  if (homeError) {
    return (
      <div className="pop space-y-4">
        <h1 className="text-3xl font-extrabold sm:text-4xl">That address didn&apos;t take</h1>
        <ErrorNote>{homeError}</ErrorNote>
        <Button onClick={onBack}>Try another address</Button>
      </div>
    );
  }

  return (
    <div className="pop">
      <h1 className="text-3xl font-extrabold sm:text-5xl">
        Scouting your <span className="marker">neighborhood</span>
      </h1>
      <p className="mt-3 flex items-start gap-2 text-ink-soft">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <span>{home?.address ?? "Pinning your address on the map..."}</span>
      </p>

      <div className="mt-5 h-3 overflow-hidden rounded-full border-2 border-ink bg-white" aria-hidden>
        <div className="h-full bg-honey transition-all duration-500" style={{ width: `${Math.max(6, (settled / TRADES.length) * 100)}%` }} />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2" aria-live="polite">
        {TRADES.map((t) => {
          const r = rows[t.id];
          return (
            <li
              key={t.id}
              className={cx(
                "flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-colors",
                r.state === "done" ? "border-ink bg-white" : r.state === "failed" ? "border-warn/50 bg-warn-soft" : "border-line bg-white",
              )}
            >
              <TradeIcon id={t.id} tile />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-tight">{t.label}</span>
                <span className={cx("block text-sm", r.state === "done" ? "font-semibold text-go" : r.state === "failed" ? "text-warn" : "text-mute")}>
                  {r.state === "done"
                    ? r.count
                      ? `${plural(r.count, t.pro.toLowerCase())} found`
                      : "None nearby yet"
                    : r.state === "failed"
                      ? "Couldn't load, we'll retry later"
                      : "Looking..."}
                </span>
              </span>
              {r.state === "done" ? (
                <span className="pop flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-go text-white">
                  <Check className="h-4 w-4" aria-hidden />
                </span>
              ) : r.state === "failed" ? (
                <TriangleAlert className="h-5 w-5 text-warn" aria-hidden />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-mute" aria-hidden />
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {finished ? (
          <>
            <Button size="lg" onClick={onDone}>
              {anyGood ? `See all ${total} pros` : "Carry on anyway"} <ArrowRight className="h-5 w-5" aria-hidden />
            </Button>
            {failed.length > 0 && (
              <Button variant="outline" onClick={() => scout(failed)}>
                <RotateCw className="h-4 w-4" aria-hidden /> Retry the {failed.length} that failed
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm font-semibold text-ink-soft">
            {total > 0 ? `${total} pros so far. Hang tight.` : "This takes a few seconds."}
          </p>
        )}
      </div>
    </div>
  );
}

/** Step 3: the payoff. */
function SortedStep({ uid, home }: { uid: string; home?: Home }) {
  const { data: pros, loading } = usePros(uid);
  const [added, setAdded] = useState<string[]>([]);

  const tops = useMemo(
    () =>
      TRADES.map((t) => {
        const mine = pros.filter((p) => p.trade === t.id && p.source === "google");
        return { trade: t, count: mine.length, top: rankPros(mine)[0] };
      }),
    [pros],
  );
  const total = pros.filter((p) => p.source === "google").length;

  return (
    <div className="pop">
      <h1 className="text-3xl font-extrabold sm:text-5xl">
        Your neighborhood, <span className="marker">sorted</span>
      </h1>
      <p className="mt-3 text-lg text-ink-soft">
        {loading ? (
          "Counting them up..."
        ) : (
          <>
            <strong className="text-ink">{plural(total, "local pro")}</strong> near{" "}
            {home?.city ?? "you"}, ranked by who&apos;s most likely to pick up, show up and do it right. Here&apos;s the
            front of each line.
          </>
        )}
      </p>

      {loading ? (
        <Spinner label="Sorting" />
      ) : (
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {tops.map(({ trade: t, count, top }) => (
            <li key={t.id}>
              <Link
                href={top ? `/pros/${top.pro.id}` : `/pros?trade=${t.id}`}
                className="flex h-full items-center gap-3 rounded-xl border-2 border-ink bg-white px-3 py-2.5 shadow-hard-sm transition-colors hover:bg-honey-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky/40"
              >
                <TradeIcon id={t.id} tile />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-wide text-mute">
                    {t.label} · {count}
                  </span>
                  {top ? (
                    <>
                      <span className="block truncate text-[15px] font-bold">{top.pro.name}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
                        <Stars rating={top.pro.rating} count={top.pro.reviewCount} />
                        {top.pro.distanceMi != null && <span>{top.pro.distanceMi} mi</span>}
                      </span>
                    </>
                  ) : (
                    <span className="block text-sm text-mute">Nobody found yet. We&apos;ll look again later.</span>
                  )}
                </span>
                {top && <ScoreDial score={top.score} />}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card flat className="mt-6 bg-honey-soft p-4 sm:p-5">
        <h2 className="text-xl font-extrabold">Already have someone you trust?</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Add them now and they go straight into your crew, ahead of the strangers. Skip it if you like.
        </p>
        {added.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {added.map((n, i) => (
              <Badge key={i} tone="green">
                <Check className="h-3 w-3" aria-hidden /> {n} is in your crew
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-3">
          <AddProForm uid={uid} compact onAdded={(p) => setAdded((a) => [...a, p.name])} />
        </div>
      </Card>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/jobs/new" size="lg" className="flex-1">
          Something broke? Start a job <ArrowRight className="h-5 w-5" aria-hidden />
        </LinkButton>
        <LinkButton href="/home" size="lg" variant="outline">
          Look around
        </LinkButton>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step | null>(null);
  const [placeId, setPlaceId] = useState<string>();
  const [home, setHome] = useState<Home>();
  const [attempt, setAttempt] = useState(0);

  // Decide once where this person belongs: login, the app, or somewhere in this flow.
  useEffect(() => {
    if (loading || step !== null) return;
    if (!user) return router.replace("/login");
    if (profile?.home && profile.onboardedAt) return router.replace("/home");
    if (profile?.home) {
      // They picked an address last time but left before the scouting finished.
      setHome(profile.home);
      setStep(2);
    } else {
      setStep(1);
    }
  }, [loading, user, profile, step, router]);

  // Signed out mid-flow.
  useEffect(() => {
    if (!loading && !user && step !== null) router.replace("/login");
  }, [loading, user, step, router]);

  const finish = useCallback(() => {
    setStep(3);
    if (user) {
      setDoc(userRef(user.uid), { onboardedAt: Date.now() }, { merge: true }).catch((err) =>
        console.error("[onboarding]", err),
      );
    }
  }, [user]);

  if (loading || !user || step === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Opening the front door" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="stripes h-3 border-b-2 border-ink" aria-hidden />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Logo />
          <span className="text-sm font-bold text-ink-soft">
            {profile?.name ? `Hi ${profile.name}. ` : ""}Step {step} of 3
          </span>
        </div>
        <Progress step={step} />
        <Card className="mt-6 p-5 sm:p-8">
          {step === 1 && (
            <AddressStep
              onPick={(s) => {
                setPlaceId(s.placeId);
                setHome(undefined);
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <ScoutStep
              key={attempt}
              placeId={placeId}
              home={home}
              onHome={setHome}
              onDone={finish}
              onBack={() => {
                setAttempt((a) => a + 1);
                setStep(1);
              }}
            />
          )}
          {step === 3 && <SortedStep uid={user.uid} home={home ?? profile?.home} />}
        </Card>
        {step === 1 && (
          <p className="mt-5 text-center text-sm text-mute">
            Takes about ten seconds. We never contact a business for you.
          </p>
        )}
      </div>
    </div>
  );
}
