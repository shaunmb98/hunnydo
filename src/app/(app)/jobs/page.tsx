"use client";
import { Camera } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState, LinkButton, PageHeader, Spinner } from "@/components/ui";
import { useJobs } from "@/lib/db";

export default function JobsPage() {
  const { user } = useAuth();
  const { data: jobs, loading } = useJobs(user?.uid);
  const active = jobs.filter((j) => j.status !== "done");
  const done = jobs.filter((j) => j.status === "done");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Jobs"
        subtitle="Everything that broke, and where each one stands."
        action={
          <LinkButton href="/jobs/new">
            <Camera className="h-4 w-4" aria-hidden /> New job
          </LinkButton>
        }
      />
      {loading ? (
        <Spinner label="Loading your jobs" />
      ) : jobs.length === 0 ? (
        <EmptyState
          emoji="🧰"
          title="Nothing broken yet"
          body="When something does break, snap a photo. You'll get a plain-English diagnosis and a write-up you can send to every pro."
          action={<LinkButton href="/jobs/new">Something broke?</LinkButton>}
        />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-xl font-extrabold">Active ({active.length})</h2>
            {active.length ? (
              <div className="space-y-3">
                {active.map((j) => (
                  <JobCard key={j.id} job={j} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-ink bg-white px-4 py-6 text-center text-ink-soft">
                All caught up. Nothing open right now.
              </p>
            )}
          </section>
          {done.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-extrabold">Done ({done.length})</h2>
              <div className="space-y-3 opacity-90">
                {done.map((j) => (
                  <JobCard key={j.id} job={j} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
