"use client";
import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { useBiz } from "@/components/biz/bits";
import { TradeIcon } from "@/components/TradeIcon";
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, LinkButton, PageHeader, Spinner, Textarea, Toggle } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { BoardJob, Business } from "@/lib/biz-types";
import { cx, moneyRange, timeAgo } from "@/lib/format";
import { trade, URGENCY } from "@/lib/trades";

export default function JobBoardPage() {
  const { data, error, loading, reload } = useBiz<{ business: Business; jobs: BoardJob[] }>("/api/biz/jobs");
  if (loading) return <Spinner label="Looking for jobs near you" />;
  const biz = data?.business;
  const jobs = data?.jobs ?? [];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Job board"
        subtitle={
          biz
            ? `Open jobs within ${biz.radiusMi} miles of ${biz.name}, in the trades on your profile.`
            : "Open jobs near your business."
        }
        action={
          <LinkButton href="/biz/profile" variant="outline" size="sm">
            Change trades or radius
          </LinkButton>
        }
      />
      <ErrorNote>{error}</ErrorNote>
      {!error && jobs.length === 0 && (
        <EmptyState
          icon={<Search className="h-8 w-8" aria-hidden />}
          title="Nothing open near you right now"
          body="New jobs show up here as homeowners post them. A wider radius or more trades on your profile will show you more."
        />
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {jobs.map((j) => (
          <JobCard key={j.jobId} job={j} biz={biz} onSent={reload} />
        ))}
      </div>
    </div>
  );
}

function JobCard({ job, biz, onSent }: { job: BoardJob; biz?: Business; onSent: () => void }) {
  const [more, setMore] = useState(false);
  const [bidding, setBidding] = useState(false);
  const u = URGENCY[job.urgency];
  return (
    <Card className="overflow-hidden">
      {job.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={job.photoUrl} alt="Photo the homeowner took of the problem" className="h-44 w-full border-b border-line object-cover" />
      )}
      <div className="space-y-3 p-5">
        <div className="flex items-start gap-3">
          <TradeIcon trade={job.trade} tile />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold leading-tight">{job.title}</h2>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
              <span>{trade(job.trade).label}</span>
              <span className="inline-flex items-center gap-1">
                {job.city || "Nearby"}, about {Math.max(1, Math.round(job.distanceMi))} mi away
              </span>
              <span>Posted {timeAgo(job.createdAt)}</span>
            </p>
          </div>
          <Badge tone={u.tone}>{u.label}</Badge>
        </div>
        <p className="text-[15px]">{job.summary}</p>
        <div className="flex flex-wrap gap-2">
          <Badge tone="honey">Expected {moneyRange(job.costLow, job.costHigh)}</Badge>
          <Badge>{job.offerCount === 0 ? "No bids yet" : job.offerCount === 1 ? "1 bid so far" : `${job.offerCount} bids so far`}</Badge>
          <Badge>{job.serviceFeeOk ? "OK with a service-call fee" : "Prefers no service-call fee"}</Badge>
        </div>
        <button
          type="button"
          onClick={() => setMore(!more)}
          aria-expanded={more}
          className="flex items-center gap-1 text-sm font-bold underline cursor-pointer"
        >
          {more ? "Hide the job brief" : "Read the job brief"}
          <ChevronDown className={cx("h-4 w-4 transition-transform", more && "rotate-180")} aria-hidden />
        </button>
        {more && <p className="whitespace-pre-wrap rounded-md border border-line bg-paper p-3 text-sm leading-relaxed">{job.brief}</p>}
        {job.myOffer && !bidding && (
          <p className="text-sm font-semibold">
            You bid {moneyRange(job.myOffer.amountLow, job.myOffer.amountHigh)} {timeAgo(job.myOffer.updatedAt)}.
          </p>
        )}
        {bidding ? (
          <BidForm
            job={job}
            biz={biz}
            onDone={() => {
              setBidding(false);
              onSent();
            }}
            onCancel={() => setBidding(false)}
          />
        ) : (
          <Button variant={job.myOffer ? "outline" : "primary"} onClick={() => setBidding(true)}>
            {job.myOffer ? "Change your bid" : "Bid on this"}
          </Button>
        )}
      </div>
    </Card>
  );
}

function BidForm({ job, biz, onDone, onCancel }: { job: BoardJob; biz?: Business; onDone: () => void; onCancel: () => void }) {
  const mine = job.myOffer;
  const [low, setLow] = useState(mine ? String(mine.amountLow) : "");
  const [high, setHigh] = useState(mine ? String(mine.amountHigh) : "");
  const [fee, setFee] = useState(String(mine?.serviceFee ?? biz?.serviceFee ?? ""));
  const [credited, setCredited] = useState(mine?.serviceFeeCredited ?? biz?.serviceFeeCredited ?? false);
  const [availability, setAvailability] = useState(mine?.availability ?? "");
  const [includes, setIncludes] = useState(mine?.includes ?? "");
  const [warranty, setWarranty] = useState(mine?.warranty ?? "");
  const [notes, setNotes] = useState(mine?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/biz/offer", {
        jobId: job.jobId,
        amountLow: low,
        amountHigh: high || low,
        serviceFee: fee,
        serviceFeeCredited: credited,
        availability,
        includes,
        warranty,
        notes,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="space-y-4 rounded-md border border-line bg-paper p-4">
      <p className="font-bold">Your bid</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Price, low end">
          <Input type="number" min={1} required value={low} onChange={(e) => setLow(e.target.value)} placeholder="350" />
        </Field>
        <Field label="Price, high end">
          <Input type="number" min={1} value={high} onChange={(e) => setHigh(e.target.value)} placeholder="600" />
        </Field>
        <Field label="Service-call fee">
          <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0" />
        </Field>
      </div>
      <Toggle checked={credited} onChange={setCredited} label="Fee is credited toward the job if they hire you" />
      <Field label="Earliest you could get there">
        <Input required value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Tomorrow morning, 8 to 10" />
      </Field>
      <Field label="What's included" hint="One item per line">
        <Textarea value={includes} onChange={(e) => setIncludes(e.target.value)} placeholder={"Parts and labor\nHaul away the old unit"} />
      </Field>
      <Field label="Warranty">
        <Input value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="1 year on labor" />
      </Field>
      <Field label="Note to the homeowner">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything they should know before picking." />
      </Field>
      <p className="text-xs text-ink-soft">
        The homeowner sees this next to your Google rating and phone number. They don't see other pros' bids, and neither do you.
      </p>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex gap-2">
        <Button type="submit" loading={busy}>
          {mine ? "Update bid" : "Send bid"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
