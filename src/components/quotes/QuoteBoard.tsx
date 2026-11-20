"use client";
import { updateDoc } from "firebase/firestore";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button, Spinner } from "@/components/ui";
import { jobRef, useBids, usePros } from "@/lib/db";
import { STATUS_META, STATUS_ORDER, type BoardBid } from "@/lib/quotes-shared";
import type { Job } from "@/lib/types";
import { BidCard } from "./BidCard";
import { Booked } from "./Booked";
import { Compare } from "./Compare";
import { HireSheet } from "./HireSheet";
import { Matches } from "./Matches";
import { QuoteForm } from "./QuoteForm";
import { SectionTitle } from "./bits";

/** Everything about getting and comparing quotes for one job. Rendered on the job page once a diagnosis exists. */
export function QuoteBoard({ job }: { job: Job }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const { data: pros, loading: prosLoading } = usePros(uid);
  const { data: rawBids, loading: bidsLoading } = useBids(uid, job.id);
  const bids = rawBids as BoardBid[];

  const [quoteFor, setQuoteFor] = useState<string | null>(null);
  const [hireFor, setHireFor] = useState<string | null>(null);
  const [addMore, setAddMore] = useState(false);
  const [emailed, setEmailed] = useState<boolean | null>(null);

  const hired = bids.find((b) => b.status === "hired");
  const booked = !!hired || !!job.hiredProId;
  const quoted = useMemo(
    () => bids.filter((b) => b.quote && (b.status === "quoted" || b.status === "hired")),
    [bids],
  );
  const quoteCount = bids.filter((b) => b.quote).length;
  const groups = STATUS_ORDER.map((status) => ({
    status,
    bids: bids.filter((b) => b.status === status).sort((a, b) => b.updatedAt - a.updatedAt),
  })).filter((g) => g.bids.length);

  // Keep the counts the jobs list shows in step with the board.
  useEffect(() => {
    if (!uid || bidsLoading) return;
    if ((job.bidCount ?? 0) === bids.length && (job.quoteCount ?? 0) === quoteCount) return;
    updateDoc(jobRef(uid, job.id), { bidCount: bids.length, quoteCount }).catch(() => {});
  }, [uid, job.id, job.bidCount, job.quoteCount, bids.length, quoteCount, bidsLoading]);

  if (!uid || !job.diagnosis) return null;
  if (bidsLoading) return <Spinner label="Loading your quote board" />;

  const quoteBid = bids.find((b) => b.id === quoteFor);
  const hireBid = bids.find((b) => b.id === hireFor);
  const passedButContacted = bids.filter((b) => b.status === "declined" && (b.contactedAt || b.quote));

  return (
    <div className="space-y-10" data-job={job.id}>
      {booked && <Booked job={job} hired={hired} passed={passedButContacted} emailed={emailed} />}

      {!booked && quoted.length > 0 && (
        <Compare job={job} bids={quoted} locked={booked} onHire={(b) => setHireFor(b.id)} />
      )}

      {bids.length > 0 && (
        <section>
          <SectionTitle
            step={booked ? undefined : "Step 2"}
            title={booked ? "Everyone you asked" : "Your quote board"}
            sub={
              booked
                ? undefined
                : "Send each request from your own phone or email, then tell us how it went. It's one write-up, so you don't repeat yourself."
            }
            action={
              !booked &&
              !addMore && (
                <Button variant="outline" size="sm" onClick={() => setAddMore(true)}>
                  <Plus className="h-4 w-4" aria-hidden /> Ask more pros
                </Button>
              )
            }
          />
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.status}>
                <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
                  {STATUS_META[g.status].group} <span className="text-mute">({g.bids.length})</span>
                </p>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {g.bids.map((bid) => (
                    <BidCard
                      key={bid.id}
                      uid={uid}
                      job={job}
                      bid={bid}
                      locked={booked}
                      onLogQuote={(b) => setQuoteFor(b.id)}
                      onHire={(b) => setHireFor(b.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {booked && quoted.length > 1 && <Compare job={job} bids={quoted} locked onHire={() => {}} />}

      {!booked && (bids.length === 0 || addMore) && (
        <section>
          <Matches job={job} pros={pros} prosLoading={prosLoading} bids={bids} onDrafted={() => setAddMore(false)} />
        </section>
      )}

      {quoteBid && <QuoteForm uid={uid} jobId={job.id} bid={quoteBid} onClose={() => setQuoteFor(null)} />}
      {hireBid && (
        <HireSheet
          jobId={job.id}
          bid={hireBid}
          openCount={bids.filter((b) => b.id !== hireBid.id && b.status !== "declined" && b.status !== "hired").length}
          onClose={() => setHireFor(null)}
          onHired={(sent) => {
            setEmailed(sent);
            setHireFor(null);
          }}
        />
      )}
    </div>
  );
}
