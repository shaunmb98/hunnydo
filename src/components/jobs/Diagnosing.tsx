"use client";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { cx } from "@/lib/format";

const WITH_PHOTO = ["Looking at the photo", "Working out which trade this is", "Checking how urgent it is", "Pricing it for your area", "Writing it up for the pros"];
const NO_PHOTO = ["Reading what you wrote", "Working out which trade this is", "Checking how urgent it is", "Pricing it for your area", "Writing it up for the pros"];

/** Shown while the diagnosis runs (usually 30 to 45 seconds). Steps tick over on a timer; the last one waits for the real result. */
export function Diagnosing({ photoUrl, description }: { photoUrl?: string; description?: string }) {
  const lines = photoUrl ? WITH_PHOTO : NO_PHOTO;
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, lines.length - 1)), 7000);
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-5 p-5 sm:grid-cols-[200px_1fr] sm:p-6">
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Your photo" className="h-44 w-full animate-pulse rounded-md border border-line object-cover sm:h-full sm:max-h-56" />
        )}
        <div className={photoUrl ? "" : "sm:col-span-2"}>
          <h1 className="text-2xl font-bold sm:text-3xl">Taking a look</h1>
          <p className="mt-1 text-ink-soft">This takes about half a minute. You can leave this page and it&apos;ll be here when you&apos;re back.</p>
          <ol className="mt-4 space-y-2" aria-live="polite">
            {lines.map((line, i) => (
              <li key={line} className={cx("flex items-center gap-2.5 font-semibold", i > step && "text-mute")}>
                <span
                  className={cx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line",
                    i < step ? "bg-go text-white" : i === step ? "bg-honey" : "border-line bg-white",
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : i === step ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                </span>
                {line}
              </li>
            ))}
          </ol>
          {description && <p className="mt-4 rounded-md bg-paper px-3 py-2 text-sm text-ink-soft">You said: {description}</p>}
        </div>
      </div>
    </Card>
  );
}
