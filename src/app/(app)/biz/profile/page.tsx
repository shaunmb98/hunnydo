"use client";
import { useEffect, useState } from "react";
import { TradePicker, useBiz, VerificationNote } from "@/components/biz/bits";
import { Button, Card, ErrorNote, Field, Input, PageHeader, Spinner, Stars, Textarea, Toggle } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { Business } from "@/lib/biz-types";
import type { TradeId } from "@/lib/types";

export default function BizProfilePage() {
  const { data, error: loadError, loading } = useBiz<{ business: Business }>("/api/biz/profile");
  const biz = data?.business;
  const [about, setAbout] = useState("");
  const [trades, setTrades] = useState<TradeId[]>([]);
  const [radius, setRadius] = useState("15");
  const [fee, setFee] = useState("");
  const [credited, setCredited] = useState(false);
  const [license, setLicense] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!biz) return;
    setAbout(biz.about ?? "");
    setTrades(biz.trades);
    setRadius(String(biz.radiusMi));
    setFee(biz.serviceFee != null ? String(biz.serviceFee) : "");
    setCredited(!!biz.serviceFeeCredited);
    setLicense(biz.licenseNumber ?? "");
  }, [biz]);

  if (loading) return <Spinner label="Loading your business" />;
  if (!biz) return <ErrorNote>{loadError || "We couldn't load your business."}</ErrorNote>;

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api("/api/biz/profile", {
        about,
        trades,
        radiusMi: Number(radius),
        serviceFee: fee,
        serviceFeeCredited: credited,
        licenseNumber: license,
      });
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Business profile" subtitle="Homeowners see this next to your bid." />
      <Card className="space-y-1 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">{biz.name}</h2>
          <Stars rating={biz.rating} count={biz.reviewCount} />
        </div>
        <p className="text-sm text-ink-soft">{biz.address}</p>
        {biz.phone && <p className="text-sm text-ink-soft">{biz.phone}</p>}
        <p className="pt-1 text-xs text-mute">Name, address, phone and rating come from your Google listing.</p>
      </Card>
      <VerificationNote phone={biz.phone} />
      <Card className="space-y-5 p-5">
        <Field label="About your business" hint="A few plain sentences. Years in business, what you're best at.">
          <Textarea value={about} onChange={(e) => setAbout(e.target.value)} maxLength={1200} />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-bold">Work you take on</p>
          <TradePicker value={trades} onChange={setTrades} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Service radius" hint="Miles">
            <Input type="number" min={1} max={100} value={radius} onChange={(e) => setRadius(e.target.value)} />
          </Field>
          <Field label="Service-call fee" hint="Dollars. Leave blank if none.">
            <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
          </Field>
          <Field label="License number" hint="Your state contractor license number, if you have one">
            <Input value={license} onChange={(e) => setLicense(e.target.value)} />
          </Field>
        </div>
        <Toggle
          checked={credited}
          onChange={setCredited}
          label="Credit the service-call fee toward the job"
          description="If they hire you, the fee comes off the bill."
        />
        <ErrorNote>{error}</ErrorNote>
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={busy} disabled={!trades.length}>
            Save profile
          </Button>
          {saved && <span className="text-sm font-bold text-go">Saved</span>}
        </div>
      </Card>
    </div>
  );
}
