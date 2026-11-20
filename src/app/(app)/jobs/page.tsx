"use client";
import { Camera, Wrench } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { JobCard } from "@/components/jobs/JobCard";
import { Card, LinkButton, PageHeader, Spinner } from "@/components/ui";
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
        <Card flat className="border-dashed px-6 py-10 text-center">
          <Wrench className="mx-auto h-10 w-10" aria-hidden />
          <h3 className="mt-3 text-xl font-bold">Nothing broken yet</h3>
          <p className="mx-auto mt-1 max-w-md text-ink-soft">
            When something does break, snap a photo. You&apos;ll get a plain-English diagnosis and a write-up you can send to every pro.
          </p>
          <div className="mt-5 flex justify-center">
            <LinkButton href="/jobs/new">Something broke?</LinkButton>
          </div>
        </Card>
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
