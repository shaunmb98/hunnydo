"use client";
import { updateDoc } from "firebase/firestore";
import { AlertTriangle, Check, ClipboardCopy, Eye, Flag, HelpCircle, BookOpen, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, ErrorNote, Textarea } from "@/components/ui";
import { api } from "@/lib/api-client";
import { jobRef } from "@/lib/db";
import { cx, moneyRange } from "@/lib/format";
import type { JobDoc } from "@/lib/jobs-extra";
import { trade, URGENCY } from "@/lib/trades";
import { TradeIcon } from "./TradeIcon";
import { UrgencyBadge } from "./JobCard";

function Section({ title, children }: { icon: typeof Eye; title: string; children: React.ReactNode }) {
  return (
    <Card flat className="p-4 sm:p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2">{children}</div>
    </Card>
  );
}

function Dots({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 leading-snug">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" aria-hidden />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

const urgencyBar = {
  emergency: "bg-stop-soft",
  soon: "bg-warn-soft",
  routine: "bg-go-soft",
} as const;

export function DiagnosisView({ job, uid }: { job: JobDoc; uid: string }) {
  const d = job.diagnosis!;
  const t = trade(d.trade);
  const u = URGENCY[d.urgency] ?? URGENCY.soon;
  const ref = jobRef(uid, job.id);
  const done = job.safetyDone ?? [];

  // Job brief editor: keep local edits, but pick up a fresh brief after a re-check.
  const [brief, setBrief] = useState(d.jobBrief);
  const [savedBrief, setSavedBrief] = useState(d.jobBrief);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [briefError, setBriefError] = useState("");
  useEffect(() => {
    if (d.jobBrief !== savedBrief) {
      setBrief(d.jobBrief);
      setSavedBrief(d.jobBrief);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.jobBrief]);
  const dirty = brief !== savedBrief;
  const blanks = /\[[^\]]+\]/.test(brief);

  async function saveBrief() {
    setSaving(true);
    setBriefError("");
    try {
      await updateDoc(ref, { "diagnosis.jobBrief": brief, updatedAt: Date.now() });
      setSavedBrief(brief);
    } catch {
      setBriefError("Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setBriefError("Couldn't copy. Select the text and copy it by hand.");
    }
  }

  function toggleStep(i: number) {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    updateDoc(ref, { safetyDone: next }).catch((err) => console.warn("[safety]", err));
  }

  const [detail, setDetail] = useState("");
  const [rechecking, setRechecking] = useState(false);
  const [recheckError, setRecheckError] = useState("");
  async function recheck() {
    if (!detail.trim()) return;
    setRechecking(true);
    setRecheckError("");
    try {
      await api("/api/diagnose", { jobId: job.id, extraDetail: detail.trim() });
      setDetail("");
    } catch (err) {
      setRecheckError(err instanceof Error ? err.message : "That didn't go through. Try again.");
    } finally {
      setRechecking(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className=" overflow-hidden">
        <div className={cx("flex items-start gap-3 border-b border-line px-4 py-3 sm:px-5", urgencyBar[d.urgency] ?? "bg-warn-soft")}>
          {d.urgency === "emergency" ? <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-stop" aria-hidden /> : null}
          <p className="leading-snug">
            <span className="font-bold">
              {u.label}. {u.blurb}.
            </span>{" "}
            {d.urgencyReason}
          </p>
        </div>
        <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[1fr_260px]">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <UrgencyBadge urgency={d.urgency} />
              <Badge tone="honey">
                <TradeIcon trade={d.trade} className="h-3.5 w-3.5" /> {t.label}
              </Badge>
              <Badge>{d.confidence === "high" ? "Pretty sure" : d.confidence === "medium" ? "Fairly sure" : "Best guess"}</Badge>
            </div>
            <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">{d.title}</h1>
            <p className="mt-2 text-lg leading-relaxed text-ink-soft">{d.summary}</p>
            {d.confidence === "low" && (
              <p className="mt-2 rounded-md bg-paper px-3 py-2 text-sm font-semibold text-ink-soft">
                This one&apos;s a best guess. Add a detail or a clearer photo below and it&apos;ll get sharper.
              </p>
            )}
          </div>
          {job.photoUrl && (
            <a href={job.photoUrl} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={job.photoUrl} alt="Your photo of the problem" className="max-h-64 w-full rounded-md border border-line object-cover md:h-full" />
            </a>
          )}
        </div>
      </Card>

      {d.safetySteps.length > 0 && (
        <Card className="bg-paper p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-xl font-bold">
Do this now
          </h2>
          <ol className="mt-3 space-y-2">
            {d.safetySteps.map((s, i) => {
              const ticked = done.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={ticked}
                    onClick={() => toggleStep(i)}
                    className="flex w-full cursor-pointer items-start gap-3 rounded-md border border-line bg-white px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky/40"
                  >
                    <span
                      className={cx(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line text-sm font-bold",
                        ticked ? "bg-go text-white" : "bg-honey",
                      )}
                    >
                      {ticked ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                    </span>
                    <span className={cx("leading-snug", ticked && "text-mute line-through")}>{s}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">
              Your job brief. Describe it once.
            </h2>
            <p className="text-sm text-ink-soft">This goes to every pro you contact. Edit it so it sounds like you.</p>
          </div>
        </div>
        <Textarea
          className="mt-3 min-h-[200px]"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          aria-label="Job brief"
        />
        {blanks && (
          <p className="mt-1.5 text-sm font-semibold text-warn">Fill in the parts in [square brackets] before you send it.</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={copyBrief}>
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <ClipboardCopy className="h-4 w-4" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" onClick={saveBrief} loading={saving} disabled={!dirty || !brief.trim()}>
            {dirty ? "Save changes" : "Saved"}
          </Button>
          {dirty && (
            <Button variant="ghost" size="sm" onClick={() => setBrief(savedBrief)}>
              Undo
            </Button>
          )}
        </div>
        {briefError && (
          <div className="mt-2">
            <ErrorNote>{briefError}</ErrorNote>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card flat className="p-4 sm:p-5">
          <h2 className="text-lg font-bold">What a pro usually charges</h2>
          <p className="mt-1 font-display text-3xl font-bold sm:text-4xl">{moneyRange(d.costLow, d.costHigh)}</p>
          <p className="mt-2 leading-relaxed text-ink-soft">{d.costNotes}</p>
        </Card>
        <Section icon={Wrench} title="Can you fix it yourself?">
          <Badge tone={d.diyFeasible ? "green" : "red"}>{d.diyFeasible ? "Doable" : "Call a pro"}</Badge>
          <p className="mt-2 leading-relaxed">{d.diyNotes}</p>
        </Section>
        <Section icon={Wrench} title="Likely cause">
          <p className="leading-relaxed">{d.likelyCause}</p>
        </Section>
        {d.photoObservations.length > 0 && (
          <Section icon={Eye} title="What I see in your photo">
            <Dots items={d.photoObservations} />
          </Section>
        )}
        {d.questionsProsWillAsk.length > 0 && (
          <Section icon={HelpCircle} title="Questions pros will ask">
            <Dots items={d.questionsProsWillAsk} />
          </Section>
        )}
        {d.redFlags.length > 0 && (
          <Section icon={Flag} title="Red flags in a quote">
            <Dots items={d.redFlags} />
          </Section>
        )}
        {d.termsToKnow.length > 0 && (
          <div className="md:col-span-2">
            <Section icon={BookOpen} title="Terms to know">
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {d.termsToKnow.map((term, i) => {
                  const cut = term.indexOf(":");
                  return (
                    <div key={i} className="leading-snug">
                      <dt className="inline font-bold">{cut > 0 ? term.slice(0, cut) : term}</dt>
                      {cut > 0 && <dd className="inline text-ink-soft">: {term.slice(cut + 1).trim()}</dd>}
                    </div>
                  );
                })}
              </dl>
            </Section>
          </div>
        )}
      </div>

      <Card flat className="p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
Add a detail and re-check
        </h2>
        <p className="text-sm text-ink-soft">Remembered something? The age of the unit, a noise or what you&apos;ve tried can change the answer.</p>
        <Textarea
          className="mt-3"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="The water heater is a 2011 Rheem, 50 gallon, gas."
          maxLength={2000}
          disabled={rechecking}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={recheck} loading={rechecking} disabled={!detail.trim()}>
            {rechecking ? "Re-checking, about half a minute" : "Re-check"}
          </Button>
        </div>
        {(recheckError || job.diagnosisError) && (
          <div className="mt-2">
            <ErrorNote>{recheckError || job.diagnosisError}</ErrorNote>
          </div>
        )}
      </Card>
    </div>
  );
}
