import type { Job } from "./types";

/** Fields the jobs feature keeps on the job doc on top of the shared Job type. */
export type JobDoc = Job & {
  safetyDone?: number[]; // indexes of ticked "Do this now" steps
  photoNotes?: string; // what the assistant saw in the photo, reused on re-checks
};

export const ACTIVE_STATUSES: Job["status"][] = ["diagnosing", "diagnosed", "quoting", "scheduled"];

export const STATUS_LABEL: Record<Job["status"], string> = {
  diagnosing: "Working it out",
  diagnosed: "Ready for quotes",
  quoting: "Getting quotes",
  scheduled: "Scheduled",
  done: "Done",
};
