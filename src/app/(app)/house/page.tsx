"use client";
import { setDoc } from "firebase/firestore";
import { Check, ExternalLink, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Badge, Button, Card, ErrorNote, Field, Input, PageHeader, Spinner, Textarea } from "@/components/ui";
import { api } from "@/lib/api-client";
import { clean, userRef } from "@/lib/db";
import type { HouseFacts, HouseLookup } from "@/lib/house-types";

type Form = {
  pipeMaterial: string;
  waterHeaterYear: string;
  hvacYear: string;
  roofYear: string;
  electricalPanel: string;
  notes: string;
};

const toForm = (h?: Partial<HouseFacts>): Form => ({
  pipeMaterial: h?.pipeMaterial ?? "",
  waterHeaterYear: h?.waterHeaterYear ? String(h.waterHeaterYear) : "",
  hvacYear: h?.hvacYear ? String(h.hvacYear) : "",
  roofYear: h?.roofYear ? String(h.roofYear) : "",
  electricalPanel: h?.electricalPanel ?? "",
  notes: h?.notes ?? "",
});

function yearOrNull(v: string): number | null {
  const n = Number(v.trim());
  return Number.isInteger(n) && n >= 1850 && n <= new Date().getFullYear() + 1 ? n : null;
}

function Fact({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="rounded-xl border-2 border-line bg-paper px-3.5 py-2.5">
      <dt className="text-xs font-bold uppercase tracking-wide text-mute">{label}</dt>
      <dd className="text-lg font-extrabold">{value}</dd>
    </div>
  );
}

export default function HousePage() {
  const { user, profile } = useAuth();
  const house = profile?.house;
  const permits = profile?.housePermits ?? [];

  const [form, setForm] = useState<Form>(() => toForm(house));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [coverage, setCoverage] = useState<HouseLookup["coverage"] | null>(
    house?.source === "county" || house?.source === "web" ? house.source : null,
  );
  const [error, setError] = useState("");
  const asked = useRef(false);

  const check = async (force = false) => {
    setChecking(true);
    setError("");
    try {
      const res = await api<HouseLookup>("/api/house", force ? { force: true } : {});
      setCoverage(res.coverage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach the records. Try again in a bit.");
    } finally {
      setChecking(false);
    }
  };

  // First visit with nothing on file: look once on our own.
  useEffect(() => {
    if (asked.current || !user || house?.source === "county" || house?.source === "web") return;
    asked.current = true;
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return <Spinner label="Opening your house file" />;

  const set = (k: keyof Form) => (e: { target: { value: string } }) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // null clears a field the homeowner emptied out.
      const patch = {
        pipeMaterial: form.pipeMaterial.trim() || null,
        waterHeaterYear: yearOrNull(form.waterHeaterYear),
        hvacYear: yearOrNull(form.hvacYear),
        roofYear: yearOrNull(form.roofYear),
        electricalPanel: form.electricalPanel.trim() || null,
        notes: form.notes.trim().slice(0, 2000) || null,
        ...(house?.source ? {} : { source: "manual" as const }),
      };
      await setDoc(userRef(user.uid), { house: clean(patch) }, { merge: true });
      setSaved(true);
    } catch {
      setError("That didn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const hasCounty = house?.source === "county";
  const hasWeb = house?.source === "web";
  const webFound = hasWeb && Boolean(house?.yearBuilt || house?.sqft || house?.lotSqft || house?.stories || house?.lastSaleYear);
  const webSources = hasWeb ? (house?.sources ?? []).filter((s) => s.url.startsWith("https://")) : [];
  const assessorUrl = hasWeb && house?.assessorUrl?.startsWith("https://") ? house.assessorUrl : "";
  const none = coverage === "none" && !hasCounty && !hasWeb;

  return (
    <>
      <PageHeader
        title="Your house"
        subtitle="The stuff every pro asks on the phone. Fill it in once and it goes into every diagnosis and job brief."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold">
                {webFound && !checking ? "Found online" : hasWeb && !checking ? "County records" : "What the county knows"}
              </h2>
              {hasCounty && <Badge tone="blue">Public record</Badge>}
              {webFound && !checking && <Badge tone="amber">Unconfirmed</Badge>}
            </div>

            {hasCounty ? (
              <>
                <p className="mt-0.5 text-sm text-ink-soft">
                  From the {house?.sourceName ?? "county assessor"}
                  {house?.fetchedAt ? `, checked ${new Date(house.fetchedAt).toLocaleDateString("en-US")}` : ""}.
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-2.5">
                  <Fact label="Year built" value={house?.yearBuilt} />
                  <Fact label="Living space" value={house?.sqft ? `${house.sqft.toLocaleString("en-US")} sq ft` : null} />
                  <Fact label="Lot" value={house?.lotSqft ? `${house.lotSqft.toLocaleString("en-US")} sq ft` : null} />
                  <Fact label="Stories" value={house?.stories} />
                  <Fact label="Walls" value={house?.construction} />
                  <Fact label="Roof" value={house?.roofType} />
                  <Fact label="Heating" value={house?.heating} />
                  <Fact label="Cooling" value={house?.cooling} />
                  <Fact label="Pool" value={house?.pool == null ? null : house.pool ? "Yes" : "No"} />
                  <Fact label="Last sold" value={house?.lastSaleYear} />
                  <Fact label="Subdivision" value={house?.subdivision} />
                  <Fact label="Parcel number" value={house?.parcelNumber} />
                </dl>
                {!house?.yearBuilt && !house?.sqft && (
                  <p className="mt-3 text-sm text-ink-soft">
                    The county has the parcel but no building details for it. That happens with condos and newer builds.
                  </p>
                )}
              </>
            ) : checking ? (
              <Spinner label="Searching public records. This can take up to a minute." />
            ) : hasWeb ? (
              <>
                {webFound ? (
                  <>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      These came from public listings and records found by search
                      {house?.fetchedAt ? ` on ${new Date(house.fetchedAt).toLocaleDateString("en-US")}` : ""}. They can be
                      wrong, so check them against the official record.
                    </p>
                    <dl className="mt-4 grid grid-cols-2 gap-2.5">
                      <Fact label="Year built" value={house?.yearBuilt} />
                      <Fact label="Living space" value={house?.sqft ? `${house.sqft.toLocaleString("en-US")} sq ft` : null} />
                      <Fact label="Lot" value={house?.lotSqft ? `${house.lotSqft.toLocaleString("en-US")} sq ft` : null} />
                      <Fact label="Stories" value={house?.stories} />
                      <Fact label="Last sold" value={house?.lastSaleYear} />
                      <Fact label="County" value={house?.county ? [house.county, house.state].filter(Boolean).join(", ") : null} />
                    </dl>
                  </>
                ) : (
                  <p className="mt-2 text-ink-soft">
                    We searched and didn&apos;t find anything that names your address
                    {house?.county ? ` in ${[house.county, house.state].filter(Boolean).join(", ")}` : ""}. The form still
                    works, and what you type in gets used the same way.
                  </p>
                )}
                {assessorUrl && (
                  <div className="mt-4 rounded-xl border-2 border-ink bg-honey-soft px-3.5 py-3">
                    <a
                      href={assessorUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-extrabold underline underline-offset-2"
                    >
                      Look up your home at the {house?.assessorName ?? "county assessor"}
                      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                    </a>
                    <p className="text-sm text-ink-soft">That&apos;s the official record.</p>
                  </div>
                )}
                {webFound && webSources.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-mute">Where this came from</h3>
                    <ul className="mt-1 space-y-1 text-sm">
                      {webSources.map((s) => (
                        <li key={s.url}>
                          <a href={s.url} target="_blank" rel="noreferrer" className="break-words font-semibold underline underline-offset-2">
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : none ? (
              <p className="mt-2 text-ink-soft">
                Public records for your county aren&apos;t hooked up yet. The form still works, and what you type in
                gets used the same way.
              </p>
            ) : (
              <p className="mt-2 text-ink-soft">Nothing on file yet. Hit the button and we&apos;ll look.</p>
            )}

            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => check(true)} loading={checking}>
                {!checking && <RotateCw className="h-4 w-4" aria-hidden />} {hasWeb ? "Check again" : "Check county records again"}
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-xl font-extrabold">Permit history</h2>
            {permits.length ? (
              <ul className="mt-3 divide-y-2 divide-line">
                {permits.map((p, i) => (
                  <li key={p.number ?? i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5">
                    <span className="w-24 shrink-0 text-sm font-bold text-ink-soft">
                      {p.date ? new Date(p.date).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "No date"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{p.type ?? "Permit"}</span>
                      {p.description && <span className="block text-sm text-ink-soft">{p.description}</span>}
                    </span>
                    {p.status && <Badge>{p.status}</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-ink-soft">
                No permits on file. Cities around here don&apos;t publish permits by address in a way we can read yet,
                so if you know about past work, put it in the notes.
              </p>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="text-xl font-extrabold">What only you know</h2>
          <p className="mb-4 mt-0.5 text-sm text-ink-soft">
            No record has these. Skip anything you&apos;re not sure about.
          </p>
          <form onSubmit={save} className="space-y-4">
            <Field label="Pipe material" hint="Copper, PEX, CPVC, galvanized, polybutylene. A guess is fine.">
              <Input value={form.pipeMaterial} onChange={set("pipeMaterial")} placeholder="Copper" maxLength={80} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Water heater year">
                <Input value={form.waterHeaterYear} onChange={set("waterHeaterYear")} inputMode="numeric" placeholder="2017" maxLength={4} />
              </Field>
              <Field label="AC / furnace year">
                <Input value={form.hvacYear} onChange={set("hvacYear")} inputMode="numeric" placeholder="2015" maxLength={4} />
              </Field>
              <Field label="Roof year">
                <Input value={form.roofYear} onChange={set("roofYear")} inputMode="numeric" placeholder="2008" maxLength={4} />
              </Field>
            </div>
            <Field label="Electrical panel" hint="Brand and amps. It's printed on the inside of the panel door.">
              <Input value={form.electricalPanel} onChange={set("electricalPanel")} placeholder="Square D, 200 amp" maxLength={80} />
            </Field>
            <Field label="Notes" hint="Past repairs, remodels, anything a pro should know walking in.">
              <Textarea value={form.notes} onChange={set("notes")} placeholder="Kitchen redone in 2019. Slab leak fixed in the hall bath in 2021." maxLength={2000} />
            </Field>
            <ErrorNote>{error}</ErrorNote>
            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving}>
                Save
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm font-bold text-go" role="status">
                  <Check className="h-4 w-4" aria-hidden /> Saved
                </span>
              )}
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
