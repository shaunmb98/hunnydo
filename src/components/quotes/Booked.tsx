"use client";
import { Phone, Undo2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, LinkButton } from "@/components/ui";
import { api } from "@/lib/api-client";
import { money, moneyRange } from "@/lib/format";
import { smsHref, telHref, thanksNote, type BoardBid } from "@/lib/quotes-shared";
import type { Job } from "@/lib/types";
import { CopyButton } from "./bits";

/** Shown once a pro is hired: the summary, plus a polite note for the ones who didn't get the job. */
export function Booked({ job, hired, passed, emailed }: { job: Job; hired?: BoardBid; passed: BoardBid[]; emailed?: boolean | null }) {
  const name = hired?.proName ?? job.hiredProName ?? "your pro";
  const title = job.diagnosis?.title ?? job.title;
  const q = hired?.quote;
  const [undoing, setUndoing] = useState(false);
  const [undoError, setUndoError] = useState("");
  // A ranged quote stays a range until the pro gives a final number.
  const ranged = q?.amountLow != null && q.amountHigh != null && q.amountLow !== q.amountHigh;
  const price = ranged ? moneyRange(q?.amountLow, q?.amountHigh) : job.hiredAmount != null ? money(job.hiredAmount) : "Not settled";
  async function undo() {
    setUndoing(true);
    setUndoError("");
    try {
      await api("/api/quotes/unhire", { jobId: job.id });
    } catch (err) {
      setUndoError(err instanceof Error ? err.message : "Couldn't undo that. Try again.");
      setUndoing(false);
    }
  }
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="p-5">
          <p className="flex items-center gap-2 text-xs font-bold">
You&apos;re booked
          </p>
          <h2 className="mt-1 text-3xl font-bold leading-tight">{name}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="border-t border-line pt-2">
              <dt className="text-xs font-bold text-ink-soft">When</dt>
              <dd className="font-bold">{job.scheduledFor ?? "Not set yet"}</dd>
            </div>
            <div className="border-t border-line pt-2">
              <dt className="text-xs font-bold text-ink-soft">Price</dt>
              <dd className="font-display text-xl font-bold">{price}</dd>
            </div>
            <div className="border-t border-line pt-2">
              <dt className="text-xs font-bold text-ink-soft">Warranty</dt>
              <dd className="font-bold">{q?.warranty ?? "They didn't say"}</dd>
            </div>
          </dl>
          {q?.includes?.length ? (
            <p className="mt-3 text-[15px] text-ink-soft">
              <span className="font-bold text-ink">Included:</span> {q.includes.join(", ")}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {hired?.proPhone && (
              <>
                <LinkButton href={telHref(hired.proPhone)}>
                  <Phone className="h-4 w-4" aria-hidden /> Call {hired.proPhone}
                </LinkButton>
                <LinkButton href={smsHref(hired.proPhone, "")} variant="outline">
Text
                </LinkButton>
              </>
            )}
          </div>
          <p className="mt-3 text-sm text-mute">
            {name} is in your crew now.
            {emailed === true && " We emailed you the details."}
            {emailed === false && " We couldn't send the confirmation email, so keep this page handy."}
          </p>
          {job.status !== "done" && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-dashed border-line pt-3">
              <span className="text-sm text-ink-soft">Booked the wrong one, or plans changed?</span>
              <Button variant="ghost" size="sm" onClick={undo} loading={undoing}>
                <Undo2 className="h-4 w-4" aria-hidden /> Undo booking
              </Button>
              {undoError && <span className="text-sm font-semibold text-stop">{undoError}</span>}
            </div>
          )}
        </div>
      </Card>

      {passed.length > 0 && (
        <Card flat className="p-4 sm:p-5">
          <h3 className="text-xl font-bold">Let the others know</h3>
          <p className="mt-1 text-ink-soft">
            They took the time to get back to you. A quick note keeps the door open for next time.
          </p>
          <ul className="mt-3 space-y-3">
            {passed.map((b) => {
              const note = thanksNote(b, title);
              return (
                <li key={b.id} className="rounded-md border border-line p-3">
                  <p className="font-bold">{b.proName}</p>
                  <p className="mt-1 text-[15px] text-ink-soft">{note}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CopyButton text={note}>Copy note</CopyButton>
                    {b.proPhone && (
                      <LinkButton href={smsHref(b.proPhone, note)} size="sm" variant="outline">
Text it
                      </LinkButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
