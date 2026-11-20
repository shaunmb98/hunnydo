"use client";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { Camera, ImagePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button, Card, ErrorNote, Field, Input, PageHeader, Textarea, Toggle } from "@/components/ui";
import { api } from "@/lib/api-client";
import { clean, jobsRef } from "@/lib/db";
import { storage } from "@/lib/firebase";
import { cx } from "@/lib/format";
import { PHOTO_DECODE_MESSAGE, resizePhoto, type ResizedPhoto } from "@/lib/jobs-photo";
import type { Job } from "@/lib/types";

const EXAMPLES = [
  "Water pooling by the meter",
  "AC blowing warm air",
  "Breaker keeps tripping",
  "Water heater leaking from the bottom",
  "Brown stain on the ceiling",
  "Sprinkler zone won't shut off",
  "Dishwasher won't drain",
  "Scorpions in the garage",
];

export default function NewJobPage() {
  const { user } = useAuth();
  const router = useRouter();
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<ResizedPhoto | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [description, setDescription] = useState("");
  const [serviceFeeOk, setServiceFeeOk] = useState(true);
  const [maxFee, setMaxFee] = useState("");
  const [availability, setAvailability] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function pickFile(file?: File | null) {
    if (!file) return;
    setPhotoError("");
    setPhotoBusy(true);
    try {
      setPhoto(await resizePhoto(file));
    } catch (err) {
      setPhoto(null);
      setPhotoError(err instanceof Error ? err.message : PHOTO_DECODE_MESSAGE);
    } finally {
      setPhotoBusy(false);
      if (cameraInput.current) cameraInput.current.value = "";
      if (libraryInput.current) libraryInput.current.value = "";
    }
  }

  function addExample(text: string) {
    setDescription((d) => (d.trim() ? `${d.trim().replace(/[.,]$/, "")}. ${text}` : text));
  }

  const canSubmit = !!user && !photoBusy && (!!photo || description.trim().length > 2);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const ref = doc(jobsRef(user.uid));
      const now = Date.now();
      const fee = Number(maxFee);
      const job: Omit<Job, "id"> = {
        title: "New job",
        description: description.trim(),
        status: "diagnosing",
        serviceFeeOk,
        maxServiceFee: serviceFeeOk && fee > 0 ? Math.round(fee) : undefined,
        availability: availability.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(ref, clean(job));

      // Fire the diagnosis and move on. The server writes the result to the job and the job page picks it up live.
      api("/api/diagnose", {
        jobId: ref.id,
        description: job.description,
        image: photo ? { data: photo.base64, mediaType: "image/jpeg" } : undefined,
      }).catch((err) => console.warn("[diagnose]", err));

      if (photo) {
        try {
          const photoPath = `users/${user.uid}/jobs/${ref.id}/photo.jpg`;
          const sref = storageRef(storage, photoPath);
          await uploadBytes(sref, photo.blob, { contentType: "image/jpeg" });
          await updateDoc(ref, { photoUrl: await getDownloadURL(sref), photoPath });
        } catch (err) {
          // The diagnosis already has the photo; losing the stored copy shouldn't block the job.
          console.warn("[photo upload]", err);
        }
      }
      router.push(`/jobs/${ref.id}`);
    } catch (err) {
      console.error(err);
      setError("We couldn't save that. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl">
      <PageHeader
        title={
          <>
            Something <span className="marker">broke?</span>
          </>
        }
        subtitle="Show it or describe it. You'll only have to explain it this once."
      />

      <div className="space-y-5">
        <div>
          <p className="mb-1.5 text-sm font-bold">A photo of the problem</p>
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <input
            ref={libraryInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          {photo ? (
            <Card className="pop relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.previewUrl} alt="Your photo of the problem" className="max-h-[420px] w-full bg-ink object-contain" />
              <div className="flex items-center justify-between gap-2 border-t-2 border-ink px-3 py-2">
                <span className="text-sm font-semibold text-ink-soft">Looks good. Add a few words below if you can.</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setPhoto(null)}>
                  <X className="h-4 w-4" aria-hidden /> Remove
                </Button>
              </div>
            </Card>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className={cx(
                "rounded-2xl border-2 border-dashed border-ink p-4 text-center transition-colors sm:p-6",
                dragging ? "bg-honey" : "bg-honey-soft",
              )}
            >
              <button
                type="button"
                onClick={() => cameraInput.current?.click()}
                disabled={photoBusy}
                className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-ink bg-honey px-4 py-7 shadow-hard transition-[transform,box-shadow] hover:bg-honey-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky/40 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
              >
                <Camera className="h-10 w-10" aria-hidden />
                <span className="font-display text-2xl font-extrabold">{photoBusy ? "Getting your photo ready" : "Take a photo"}</span>
                <span className="text-sm font-semibold text-ink-soft">Get close, then one from a step back if you can</span>
              </button>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                <button
                  type="button"
                  onClick={() => libraryInput.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 font-bold text-ink underline decoration-2 underline-offset-2 hover:bg-white"
                >
                  <ImagePlus className="h-4 w-4" aria-hidden /> Choose from your photos
                </button>
                <span className="hidden sm:inline">or drag one here</span>
              </div>
            </div>
          )}
          {photoError && (
            <div className="mt-2">
              <ErrorNote>{photoError}</ErrorNote>
            </div>
          )}
          <p className="mt-1.5 text-xs text-mute">No photo? A description on its own works too.</p>
        </div>

        <div>
          <Field label="What's going on?" hint="When it started, where it is, anything you've already tried.">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="There's water bubbling up in the front yard near the meter box. Started last night. I haven't shut anything off yet."
              rows={4}
              maxLength={4000}
            />
          </Field>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => addExample(ex)}
                className="cursor-pointer rounded-full border-2 border-ink bg-white px-3 py-1 text-sm font-semibold hover:bg-honey-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky/40"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Toggle
            checked={serviceFeeOk}
            onChange={setServiceFeeOk}
            label="OK with a service-call fee"
            description={
              serviceFeeOk
                ? "Many pros charge $50 to $150 just to come out. More of them will say yes."
                : "We'll tell pros you're looking for a free estimate. Fewer may come out."
            }
          />
          {serviceFeeOk && (
            <div className="pop">
              <Field label="Most you'd pay for the visit (optional)">
                <div className="relative max-w-[200px]">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-mute">$</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1000}
                    step={5}
                    placeholder="100"
                    value={maxFee}
                    onChange={(e) => setMaxFee(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </Field>
            </div>
          )}
        </div>

        <Field label="When are you free?" hint="Goes into your write-up so pros can offer a time that works.">
          <Input
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="Weekdays after 3, or any time Saturday"
            maxLength={200}
          />
        </Field>

        <ErrorNote>{error}</ErrorNote>

        <div>
          <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!canSubmit}>
            {submitting ? "Sending it over" : "Tell me what's wrong"}
          </Button>
        </div>
        <p className="text-center text-sm text-mute">
          Takes about half a minute. Nobody gets contacted until you say so.
        </p>
      </div>
    </form>
  );
}
