"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Badge, Button, Card, ErrorNote, Stars } from "@/components/ui";
import { api } from "@/lib/api-client";
import { money, moneyRange } from "@/lib/format";
import { compareBadges, priceVerdict, type Advice, type BoardBid } from "@/lib/quotes-shared";
import type { Job } from "@/lib/types";
import { SectionTitle } from "./bits";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-dashed border-line py-2.5">
      <dt className="text-xs font-bold text-mute">{label}</dt>
      <dd className="mt-0.5 text-[15px]">{children}</dd>
    </div>
  );
}

const unknown = <span className="text-mute">They didn&apos;t say</span>;

function Items({ items, empty }: { items?: string[]; empty: ReactNode }) {
  if (!items?.length) return <>{empty}</>;
  return (
    <ul className="list-disc space-y-0.5 pl-5">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

/** Quotes next to each other. Columns on desktop, stacked cards on a phone. */
export function Compare({
  job,
  bids,
  locked,
  onHire,
}: {
  job: Job;
  bids: BoardBid[]; // quoted (or hired) bids only
  locked: boolean;
  onHire: (bid: BoardBid) => void;
}) {
  const dx = job.diagnosis;
  const badges = useMemo(() => compareBadges(bids), [bids]);
  // The last advice is saved on the job, so it survives a reload.
  const saved = (job as Job & { advice?: Advice & { quoteCount?: number } }).advice;
  const [fresh, setFresh] = useState<Advice | null>(null);
  const advice = fresh ?? saved ?? null;
  const adviceStale = !fresh && !!saved && saved.quoteCount !== bids.length;
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  async function advise() {
    setAsking(true);
    setError("");
    try {
      setFresh(await api<Advice>("/api/quotes/advise", { jobId: job.id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get advice just now. Try again.");
    } finally {
      setAsking(false);
    }
  }

  const pick = advice && bids.find((b) => b.id === advice.pick);
  const cols = bids.length >= 3 ? "lg:grid-cols-3" : "";

  return (
    <section>
      <SectionTitle
        title={bids.length === 1 ? "Your first quote" : "Side by side"}
        sub={
          dx?.costHigh
            ? `This kind of job usually runs ${moneyRange(dx.costLow, dx.costHigh)}.${bids.length === 1 ? " One more quote makes this a real comparison." : ""}`
            : undefined
        }
        action={
          !locked && (
            <Button variant="outline" onClick={advise} loading={asking}>
              {asking ? "Thinking it over" : advice ? "Ask again" : "Help me choose"}
            </Button>
          )
        }
      />
      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      {advice && pick && (
        <Card className=" mb-5 bg-paper p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-bold">
One opinion. It&apos;s your call.
          </p>
          <h3 className="mt-1 text-xl font-bold">Leaning toward {pick.proName}</h3>
          <p className="mt-1 leading-relaxed">{advice.why}</p>
          {adviceStale && (
            <p className="mt-2 text-sm font-semibold text-warn">
              Your quotes have changed since this was written. Ask again for a fresh take.
            </p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {advice.tradeoffs.length > 0 && (
              <div>
                <p className="text-sm font-bold">What you&apos;d be giving up</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px]">
                  {advice.tradeoffs.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {advice.questionsToAsk.length > 0 && (
              <div>
                <p className="text-sm font-bold">Ask before you say yes</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px]">
                  {advice.questionsToAsk.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className={`grid gap-4 md:grid-cols-2 ${cols}`}>
        {bids.map((bid) => {
          const q = bid.quote!;
          const verdict = priceVerdict(q, dx);
          return (
            <Card key={bid.id} className="flex flex-col p-4">
              <div className="flex min-h-6 flex-wrap gap-1.5">
                {bid.status === "hired" && <Badge tone="dark">Hired</Badge>}
                {advice?.pick === bid.id && <Badge tone="honey">Our lean</Badge>}
                {badges[bid.id]?.map((b) => (
                  <Badge key={b.label} tone={b.tone}>{b.label}</Badge>
                ))}
              </div>
              <h3 className="mt-2 text-lg font-bold leading-tight">{bid.proName}</h3>
              <Stars rating={bid.proRating} count={bid.proReviewCount} />
              <p className="mt-3 font-display text-3xl font-bold leading-none">
                {moneyRange(q.amountLow, q.amountHigh) || <span className="text-xl text-mute">No price yet</span>}
              </p>
              {verdict && (
                <div className="mt-2">
                  <Badge tone={verdict.tone}>{verdict.label}</Badge>
                  <p className="mt-1 text-xs text-ink-soft">{verdict.detail}</p>
                </div>
              )}
              <dl className="mt-3 flex-1">
                <Row label="When">{q.availability ?? unknown}</Row>
                <Row label="Service-call fee">
                  {q.serviceFee == null ? (
                    unknown
                  ) : q.serviceFee === 0 ? (
                    "None"
                  ) : (
                    <>
                      {money(q.serviceFee)}
                      {q.serviceFeeWaivedIfHired === true && <span className="font-bold text-go"> · comes off the bill</span>}
                      {q.serviceFeeWaivedIfHired === false && <span className="font-bold text-warn"> · charged either way</span>}
                      {!job.serviceFeeOk && <span className="block text-xs text-mute">You said you&apos;d rather not pay one.</span>}
                      {job.serviceFeeOk && job.maxServiceFee != null && q.serviceFee > job.maxServiceFee && (
                        <span className="block text-xs text-mute">Over your {money(job.maxServiceFee)} limit.</span>
                      )}
                    </>
                  )}
                </Row>
                <Row label="Included"><Items items={q.includes} empty={unknown} /></Row>
                <Row label="Not included"><Items items={q.excludes} empty={<span className="text-mute">Nothing listed</span>} /></Row>
                <Row label="Warranty">{q.warranty ?? unknown}</Row>
                <Row label="Licensed and insured">
                  {q.licensedInsured == null ? unknown : q.licensedInsured ? <span className="font-bold text-go">Yes</span> : <span className="font-bold text-stop">No</span>}
                </Row>
                {q.notes && <Row label="Also">{q.notes}</Row>}
              </dl>
              {!locked && bid.status === "quoted" && (
                <Button className="mt-3 w-full" onClick={() => onHire(bid)}>
                  Go with {bid.proName}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
