"use client";
import { ArrowRight, Camera, Check, ClipboardCheck, PhoneCall, Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { JobCard } from "@/components/jobs/JobCard";
import { TradeIcon } from "@/components/jobs/TradeIcon";
import { Card, LinkButton, Spinner } from "@/components/ui";
import { useJobs, usePros } from "@/lib/db";
import { cx } from "@/lib/format";
import { CORE_TRADES as TRADES } from "@/lib/trades";

const STEPS = [
  { title: "Snap what broke", body: "Take a photo or type a few words. You'll hear what it probably is, and whether it can wait or you need to act now." },
  { title: "Send one write-up", body: "You get a job brief in your own words. Send the same one to every pro, so you only explain it once." },
  { title: "Line up the quotes", body: "Keep each quote next to the others, pick one, and save the good pros to your crew." },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}

export default function HomePage() {
  const { user, profile } = useAuth();
  const { data: jobs, loading: jobsLoading } = useJobs(user?.uid);
  const { data: pros, loading: prosLoading } = usePros(user?.uid);

  const firstName = (profile?.name || user?.displayName || "").trim().split(/\s+/)[0];
  const city = profile?.home?.city;
  const active = jobs.filter((j) => j.status !== "done");
  const doneCount = jobs.length - active.length;
  const crew = pros.filter((p) => p.inCrew);
  const crewTrades = new Set(crew.map((p) => p.trade));
  const nearby = pros.filter((p) => p.source === "google");
  const nearbyTrades = new Set(nearby.map((p) => p.trade)).size;
  const firstTime = !jobsLoading && jobs.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-ink-soft">
          {city ? `Your house in ${city}` : "Your house"}
          {active.length ? `. ${active.length} open ${active.length === 1 ? "job" : "jobs"}.` : ". Nothing open right now."}
        </p>
      </div>

      <Card className="overflow-hidden border-transparent bg-honey">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">Something broke?</h2>
            <p className="mt-1.5 max-w-lg text-lg text-ink/80">
              Take a photo and find out what it probably is and what it usually costs.
            </p>
          </div>
          <LinkButton href="/jobs/new" variant="dark" size="lg" className="shrink-0">
            <Camera className="h-5 w-5" aria-hidden /> Take a photo
          </LinkButton>
        </div>
      </Card>

      {jobsLoading ? (
        <Spinner label="Loading your jobs" />
      ) : firstTime ? (
        <section>
          <h2 className="text-2xl font-bold">How it works</h2>
          <ol className="mt-3 max-w-2xl list-decimal space-y-2 pl-5">
            {STEPS.map((s) => (
              <li key={s.title}>
                <span className="font-bold">{s.title}.</span> <span className="text-ink-soft">{s.body}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-mute">Nothing broken today? Have a look at who&apos;s nearby so you&apos;re ready when it happens.</p>
        </section>
      ) : (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-2xl font-bold">Open jobs</h2>
            <Link href="/jobs" className="inline-flex items-center gap-1 text-sm font-bold underline decoration-2 underline-offset-2">
              All jobs{doneCount ? ` (${doneCount} done)` : ""} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {active.length ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {active.slice(0, 6).map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-line bg-white px-4 py-6 text-center text-ink-soft">
              No open jobs.
            </p>
          )}
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Your crew</h2>
            <p className="text-ink-soft">
              {prosLoading
                ? "Checking who's nearby"
                : crew.length
                  ? `${crew.length} saved ${crew.length === 1 ? "pro" : "pros"} across ${crewTrades.size} of ${TRADES.length} trades.`
                  : "Nobody saved yet. Tap a trade to see who's nearby."}
            </p>
          </div>
          <Link href="/crew" className="inline-flex items-center gap-1 text-sm font-bold underline decoration-2 underline-offset-2">
            My crew <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TRADES.map((t) => {
            const saved = crew.filter((p) => p.trade === t.id);
            const has = saved.length > 0;
            const near = nearby.filter((p) => p.trade === t.id).length;
            return (
              <Link
                key={t.id}
                href={has ? "/crew" : `/pros?trade=${t.id}`}
                className={cx(
                  "relative rounded-md border border-line p-3.5 hover:border-line-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky/40",
                  has ? "bg-white" : "border-dashed bg-white/60",
                )}
              >
                <span
                  className={cx(
                    "absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-line",
                    has ? "bg-go text-white" : "bg-white text-ink",
                  )}
                >
                  {has ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
                </span>
                <TradeIcon trade={t.id} className="h-7 w-7" />
                <p className="mt-2 font-bold leading-tight">{t.label}</p>
                <p className="truncate text-sm text-ink-soft">
                  {has ? (saved.length === 1 ? saved[0].name : `${saved.length} saved`) : near ? `${near} nearby` : `Find ${/^[aeiou]|^hvac/i.test(t.pro) ? "an" : "a"} ${t.pro.toLowerCase()}`}
                </p>
              </Link>
            );
          })}
        </div>
        {!prosLoading && nearby.length > 0 && (
          <Card flat className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <p>
              <span className="font-display text-2xl font-bold">{nearby.length}</span>{" "}
              <span className="font-semibold">
                pros near {city || "you"} across {nearbyTrades} {nearbyTrades === 1 ? "trade" : "trades"}, ranked by who&apos;s most likely to show up.
              </span>
            </p>
            <LinkButton href="/pros" variant="outline" size="sm">
              Browse pros
            </LinkButton>
          </Card>
        )}
      </section>
    </div>
  );
}
