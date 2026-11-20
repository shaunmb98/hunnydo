"use client";
import { ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge, type Tone } from "@/components/ui";
import { TradeIcon } from "./TradeIcon";
import { timeAgo } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/jobs-extra";
import { trade, URGENCY } from "@/lib/trades";
import type { Job, Urgency } from "@/lib/types";

export function UrgencyBadge({ urgency }: { urgency?: Urgency }) {
  if (!urgency) return null;
  const u = URGENCY[urgency];
  return <Badge tone={u.tone}>{u.label}</Badge>;
}

const statusTone: Record<Job["status"], Tone> = {
  diagnosing: "honey",
  diagnosed: "blue",
  quoting: "blue",
  scheduled: "green",
  done: "neutral",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** One job in a list. Used on the dashboard and the jobs page. */
export function JobCard({ job }: { job: Job }) {
  const t = trade(job.trade);
  const diagnosing = job.status === "diagnosing";
  const title = job.title && job.title !== "New job" ? job.title : diagnosing ? "Working out what this is" : job.description || "Untitled job";
  const counts = [
    job.bidCount ? plural(job.bidCount, "pro") + " contacted" : "",
    job.quoteCount ? plural(job.quoteCount, "quote") : "",
  ].filter(Boolean);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex min-w-0 items-stretch gap-3 rounded-2xl border-2 border-ink bg-white p-3 shadow-hard transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky/40"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-ink bg-honey-soft sm:h-24 sm:w-24">
        {job.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <TradeIcon trade={job.trade} className="h-9 w-9" />
          </div>
        )}
        {job.photoUrl && job.trade && (
          <span className="absolute bottom-1 right-1 rounded-md border-2 border-ink bg-honey p-0.5">
            <TradeIcon trade={job.trade} className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <UrgencyBadge urgency={job.status === "done" ? undefined : job.urgency} />
          <Badge tone={statusTone[job.status] ?? "neutral"}>
            {diagnosing && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
            {STATUS_LABEL[job.status] ?? job.status}
          </Badge>
        </div>
        <p className="mt-1 line-clamp-2 font-display text-lg font-extrabold leading-tight">{title}</p>
        <p className="mt-0.5 truncate text-sm text-ink-soft">
          {[job.trade ? t.label : "", job.hiredProName ? `Hired ${job.hiredProName}` : "", ...counts, timeAgo(job.createdAt)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 self-center text-mute transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
