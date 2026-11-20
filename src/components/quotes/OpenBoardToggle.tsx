"use client";
import { useEffect, useState } from "react";
import { ErrorNote, Toggle } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { Job } from "@/lib/types";

/** Lets the homeowner post this job to the job board so local pros can bid on it. */
export function OpenBoardToggle({ job }: { job: Job }) {
  const booked = !!job.hiredProId || job.status === "scheduled" || job.status === "done";
  const [on, setOn] = useState(!!job.openToBids);
  const [error, setError] = useState("");

  useEffect(() => setOn(!!job.openToBids), [job.openToBids]);

  // Once the job's booked, take it off the board. The server closes it whatever we send.
  useEffect(() => {
    if (booked && job.openToBids) api("/api/jobs/open", { jobId: job.id, open: false }).catch(() => {});
  }, [booked, job.openToBids, job.id]);

  if (booked || !job.diagnosis) return null;

  async function flip(next: boolean) {
    setOn(next);
    setError("");
    try {
      await api("/api/jobs/open", { jobId: job.id, open: next });
    } catch (err) {
      setOn(!next);
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-2">
      <Toggle
        checked={on}
        onChange={flip}
        label="Let local pros bid on this"
        description={
          on
            ? "It's on the job board. Bids show up below as they come in."
            : "Posts this job to pros near you. Their bids show up on your quote board."
        }
      />
      <p className="px-1 text-sm text-ink-soft">
        Pros see the job brief, the photo, the trade, the urgency and your city. They never see your street address,
        name, email or phone. You can turn this off any time.
      </p>
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}
