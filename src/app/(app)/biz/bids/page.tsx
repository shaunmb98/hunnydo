"use client";
import { ClipboardList } from "lucide-react";
import { useBiz } from "@/components/biz/bits";
import { TradeIcon } from "@/components/TradeIcon";
import { Badge, Card, EmptyState, ErrorNote, LinkButton, PageHeader, Spinner, type Tone } from "@/components/ui";
import type { OfferRow, OfferStatus } from "@/lib/biz-types";
import { money, moneyRange, timeAgo } from "@/lib/format";

const STATUS: Record<OfferStatus, { label: string; tone: Tone }> = {
  waiting: { label: "Waiting to hear back", tone: "amber" },
  hired: { label: "You got the job", tone: "green" },
  passed: { label: "They went another way", tone: "neutral" },
};

export default function BizBidsPage() {
  const { data, error, loading } = useBiz<{ offers: OfferRow[] }>("/api/biz/offers");
  if (loading) return <Spinner label="Loading your bids" />;
  const offers = data?.offers ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="My bids" subtitle="Every bid you've sent and where it stands." />
      <ErrorNote>{error}</ErrorNote>
      {!error && offers.length === 0 && (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" aria-hidden />}
          title="No bids yet"
          body="Bids you send from the job board show up here."
          action={<LinkButton href="/biz">See the job board</LinkButton>}
        />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {offers.map((o) => (
          <Card key={o.jobId} className="space-y-2 p-5">
            <div className="flex items-start gap-3">
              <TradeIcon trade={o.trade} tile />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-extrabold leading-tight">{o.title}</h2>
                <p className="text-sm text-ink-soft">
                  {o.city || "Nearby"} · sent {timeAgo(o.updatedAt)}
                </p>
              </div>
              <Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>
            </div>
            <p className="font-display text-2xl font-extrabold">{moneyRange(o.amountLow, o.amountHigh)}</p>
            <p className="text-sm text-ink-soft">
              {o.serviceFee
                ? `${money(o.serviceFee)} service call${o.serviceFeeCredited ? ", credited if hired" : ""}. `
                : "No service-call fee. "}
              Available {o.availability}.
            </p>
            {o.status === "hired" && (
              <p className="text-sm font-semibold">The homeowner has your number and will be in touch to set the time.</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
