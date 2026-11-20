"use client";
import { deleteDoc, deleteField, getDocs, updateDoc } from "firebase/firestore";
import { deleteObject, ref as storageRef } from "firebase/storage";
import { ArrowLeft, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DiagnosisView } from "@/components/jobs/DiagnosisView";
import { Diagnosing } from "@/components/jobs/Diagnosing";
import { QuoteBoard } from "@/components/quotes/QuoteBoard";
import { Button, Card, ErrorNote, LinkButton, Spinner } from "@/components/ui";
import { api } from "@/lib/api-client";
import { bidsRef, jobRef, useJob } from "@/lib/db";
import { storage } from "@/lib/firebase";
import { money } from "@/lib/format";
import type { JobDoc } from "@/lib/jobs-extra";

const STALE_MS = 150_000;

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading } = useJob(user?.uid, id);
  const job = data as JobDoc | null;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [, tick] = useState(0);

  // Re-render every so often while diagnosing so a stuck job can offer a retry.
  const diagnosing = job?.status === "diagnosing" && !job.diagnosis;
  useEffect(() => {
    if (!diagnosing) return;
    const t = setInterval(() => tick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, [diagnosing]);

  if (!user || loading) return <Spinner label="Loading the job" />;
  if (!job) {
    return (
      <Card flat className="mx-auto max-w-md border-dashed px-6 py-10 text-center">
        <h1 className="text-2xl font-extrabold">That job isn&apos;t here</h1>
        <p className="mt-1 text-ink-soft">It may have been deleted.</p>
        <div className="mt-5 flex justify-center">
          <LinkButton href="/jobs">Back to jobs</LinkButton>
        </div>
      </Card>
    );
  }

  const ref = jobRef(user.uid, job.id);
  const stale = diagnosing && Date.now() - (job.updatedAt || job.createdAt) > STALE_MS;
  const failed = !job.diagnosis && !diagnosing;

  async function retry() {
    setError("");
    try {
      await updateDoc(ref, { status: "diagnosing", diagnosisError: deleteField(), updatedAt: Date.now() });
      // The server pulls the stored photo itself, and writes any failure back to the job.
      api("/api/diagnose", { jobId: job!.id }).catch((err) => console.warn("[diagnose]", err));
    } catch {
      setError("Couldn't start that. Check your connection and try again.");
    }
  }

  async function setDone(done: boolean) {
    setBusy("done");
    setError("");
    try {
      const reopened = job!.hiredProName ? "scheduled" : job!.bidCount ? "quoting" : "diagnosed";
      await updateDoc(ref, { status: done ? "done" : reopened, updatedAt: Date.now() });
    } catch {
      setError("Couldn't update the job. Try again.");
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    setBusy("delete");
    setError("");
    try {
      if (job!.photoPath) await deleteObject(storageRef(storage, job!.photoPath)).catch(() => {});
      const bids = await getDocs(bidsRef(user!.uid, job!.id));
      await Promise.all(bids.docs.map((b) => deleteDoc(b.ref)));
      await deleteDoc(ref);
      router.replace("/jobs");
    } catch {
      setError("Couldn't delete the job. Try again.");
      setBusy("");
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All jobs
      </Link>

      {job.hiredProName && (
        <Card className="flex flex-wrap items-center gap-3 bg-go-soft p-4">
          <CheckCircle2 className="h-7 w-7 shrink-0 text-go" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-extrabold">Hired: {job.hiredProName}</p>
            <p className="text-sm text-ink-soft">
              {[job.hiredAmount != null ? money(job.hiredAmount) : "", job.scheduledFor ? `Coming ${job.scheduledFor}` : "No date set yet"]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {job.hiredProId && (
            <LinkButton href={`/pros/${job.hiredProId}`} variant="outline" size="sm">
              View pro
            </LinkButton>
          )}
        </Card>
      )}

      {job.status === "done" && (
        <Card flat className="flex items-center gap-3 p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-go" aria-hidden />
          <p className="font-bold">This job is done.</p>
        </Card>
      )}

      {diagnosing && <Diagnosing photoUrl={job.photoUrl} description={job.description} />}
      {stale && (
        <Card flat className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="font-semibold">This is taking longer than it should.</p>
          <Button variant="outline" onClick={retry}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Try again
          </Button>
        </Card>
      )}

      {failed && (
        <Card className="p-5 sm:p-6">
          <h1 className="text-2xl font-extrabold sm:text-3xl">That didn&apos;t work</h1>
          <p className="mt-1 text-ink-soft">
            {job.diagnosisError || "The diagnosis didn't finish."} Your photo and description are saved, so you won&apos;t have to redo anything.
          </p>
          {job.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.photoUrl} alt="Your photo" className="mt-4 max-h-56 rounded-xl border-2 border-ink object-cover" />
          )}
          {job.description && <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-sm text-ink-soft">You said: {job.description}</p>}
          <div className="mt-4">
            <Button onClick={retry}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Try again
            </Button>
          </div>
        </Card>
      )}

      {job.diagnosis && <DiagnosisView job={job} uid={user.uid} />}
      {job.diagnosis && <QuoteBoard job={job} />}

      <ErrorNote>{error}</ErrorNote>

      <div className="flex flex-wrap items-center gap-2 border-t-2 border-line pt-5">
        {job.diagnosis &&
          (job.status === "done" ? (
            <Button variant="outline" onClick={() => setDone(false)} loading={busy === "done"}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Reopen job
            </Button>
          ) : (
            <Button variant="dark" onClick={() => setDone(true)} loading={busy === "done"}>
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Mark job done
            </Button>
          ))}
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-stop bg-stop-soft px-3 py-2">
            <span className="text-sm font-bold text-stop">Delete this job and its quotes for good?</span>
            <Button variant="danger" size="sm" onClick={remove} loading={busy === "delete"}>
              Yes, delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" aria-hidden /> Delete
          </Button>
        )}
      </div>
    </div>
  );
}
