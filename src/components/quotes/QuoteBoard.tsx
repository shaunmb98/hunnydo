"use client";
import type { Job } from "@/lib/types";

/** Everything about getting and comparing quotes for one job. Rendered on the job page once a diagnosis exists. */
export function QuoteBoard({ job }: { job: Job }) {
  return <div data-job={job.id} />;
}
