"use client";
import { ArrowLeft, Check, Globe, Mail, MapPin, Phone, SearchX, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Empty, TradeIcon } from "@/components/pros/TradeIcon";
import { useAuth } from "@/components/AuthProvider";
import { CrewButton } from "@/components/pros/CrewButton";
import { NotesEditor } from "@/components/pros/NotesEditor";
import { Badge, Button, Card, ErrorNote, LinkButton, ScoreDial, Spinner, Stars } from "@/components/ui";
import { api } from "@/lib/api-client";
import { usePro } from "@/lib/db";
import { cx, timeAgo } from "@/lib/format";
import { telHref } from "@/lib/pros-client";
import { scorePro } from "@/lib/ranking";
import { trade as tradeInfo } from "@/lib/trades";
import type { Responsiveness, Review } from "@/lib/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ProDetailPage() {
  const { id } = useParams<{ id: string }>();
  const proId = decodeURIComponent(id);
  const { user } = useAuth();
  const { data: pro, loading } = usePro(user?.uid, proId);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  if (loading) return <Spinner label="Pulling their file" />;
  if (!pro || !user) {
    return (
      <Empty
        icon={<SearchX className="h-7 w-7" />}
        title="We can't find that pro"
        body="They may have been removed, or the link is off."
        action={<LinkButton href="/pros">Back to Find pros</LinkButton>}
      />
    );
  }

  const t = tradeInfo(pro.trade);
  const { score, reasons, cautions } = scorePro(pro);
  const resp = pro.responsiveness;
  const reviews = pro.reviews ?? [];
  const today = DAYS[new Date().getDay()];

  async function analyze() {
    setAnalyzing(true);
    setError("");
    try {
      await api<{ responsiveness: Responsiveness; reviews: Review[] }>("/api/pros/analyze", { proId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read the reviews. Try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/pros?trade=${pro.trade}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All {t.label.toLowerCase()} pros
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-md border border-line bg-honey text-3xl sm:flex" aria-hidden>
            <TradeIcon id={t.id} className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="honey">
                <TradeIcon id={t.id} className="h-3 w-3 sm:hidden" /> {t.pro}
              </Badge>
              {pro.inCrew && <Badge tone="dark">In your crew</Badge>}
              {pro.source === "manual" && <Badge>Added by you</Badge>}
              {pro.openNow != null && <Badge tone={pro.openNow ? "green" : "neutral"}>{pro.openNow ? "Open now" : "Closed right now"}</Badge>}
            </div>
            <h1 className="mt-2 break-words text-3xl font-bold leading-tight sm:text-4xl">{pro.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-soft">
              <Stars rating={pro.rating} count={pro.reviewCount} />
              {pro.distanceMi != null && <span className="text-sm">{pro.distanceMi} mi from home</span>}
            </div>
            {pro.address && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-soft">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {pro.address}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {pro.phone && (
            <LinkButton href={telHref(pro.phone)}>
              <Phone className="h-4 w-4" aria-hidden /> Call {pro.phone}
            </LinkButton>
          )}
          {pro.email && (
            <LinkButton href={`mailto:${pro.email}`} variant="outline">
              <Mail className="h-4 w-4" aria-hidden /> Email
            </LinkButton>
          )}
          {pro.website && (
            <LinkButton href={pro.website} variant="outline" external>
              <Globe className="h-4 w-4" aria-hidden /> Website
            </LinkButton>
          )}
          {pro.mapsUrl && (
            <LinkButton href={pro.mapsUrl} variant="outline" external>
              <MapPin className="h-4 w-4" aria-hidden /> Google Maps
            </LinkButton>
          )}
          <CrewButton uid={user.uid} proId={pro.id} inCrew={!!pro.inCrew} size="md" />
        </div>
      </Card>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <ScoreDial score={score} />
            <div>
              <h2 className="text-xl font-bold">Match score</h2>
              <p className="text-sm text-ink-soft">Our best guess at who picks up, shows up and does it right.</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {reasons.map((r) => (
              <li key={r} className="flex items-start gap-2 text-[15px] font-semibold">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-go text-white">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                {r}
              </li>
            ))}
            {cautions.map((c) => (
              <li key={c} className="flex items-start gap-2 text-[15px] text-ink-soft">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
                {c}
              </li>
            ))}
            {!reasons.length && !cautions.length && <li className="text-sm text-mute">Not much to go on yet.</li>}
          </ul>
          <p className="mt-4 text-xs text-mute">
            Built from star rating weighed by review count, what reviews say about showing up, distance from home, and
            whether they&apos;re reachable now.
            {!resp && pro.source === "google" ? " Read the reviews to sharpen it." : ""}
          </p>
        </Card>

        <Card className={cx("p-5", !resp && "bg-honey-soft")}>
          {resp ? (
            <>
              <div className="flex items-center gap-4">
                <ScoreDial score={resp.score} />
                <div>
                  <h2 className="text-xl font-bold">Will they show up?</h2>
                  <p className="text-sm text-ink-soft">From their reviews, read {timeAgo(resp.analyzedAt)}.</p>
                </div>
              </div>
              <p className="mt-4 text-[15px] font-semibold">{resp.verdict}</p>
              {resp.signals.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {resp.signals.map((s, i) => (
                    <li key={i} className="rounded-md border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">Will they show up?</h2>
              <p className="mt-1 text-[15px] text-ink-soft">
                {pro.source === "google"
                  ? "Stars don't tell you who answers the phone. We'll read their reviews and pull out what people say about callbacks, quotes and showing up on time."
                  : "You added this one yourself, so there are no Google reviews to read. Go by your own notes."}
              </p>
              {pro.source === "google" && (
                <Button className="mt-4" onClick={analyze} loading={analyzing}>
                  {!analyzing && <Sparkles className="h-4 w-4" aria-hidden />}
                  {analyzing ? "Reading the reviews..." : "Read the reviews for me"}
                </Button>
              )}
            </>
          )}
          <div className="mt-3">
            <ErrorNote>{error}</ErrorNote>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold">My notes</h2>
          <div className="mt-3">
            <NotesEditor uid={user.uid} proId={pro.id} value={pro.notes} rows={5} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold">Hours</h2>
          {pro.hours?.length ? (
            <ul className="mt-3 space-y-1 text-[15px]">
              {pro.hours.map((h) => {
                const [day, ...rest] = h.split(": ");
                const isToday = day === today;
                return (
                  <li key={h} className={cx("flex justify-between gap-4 rounded-md px-2 py-1", isToday && "bg-honey-soft font-bold")}>
                    <span>{day}</span>
                    <span className="text-right text-ink-soft">{rest.join(": ")}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-mute">No hours listed. Best to call and ask.</p>
          )}
        </Card>
      </div>

      {resp && (
        <section className="mt-6">
          <h2 className="text-2xl font-bold">What people said</h2>
          {reviews.length ? (
            <ul className="mt-3 space-y-3">
              {reviews.map((r, i) => (
                <li key={i}>
                  <Card flat className="p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-bold">{r.author}</span>
                      <Stars rating={r.rating} />
                      {r.when && <span className="text-sm text-mute">{r.when}</span>}
                    </div>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{r.text}</p>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-ink-soft">No written reviews on Google yet.</p>
          )}
          {pro.mapsUrl && reviews.length > 0 && (
            <p className="mt-3 text-sm text-mute">
              These are the reviews Google shares with us.{" "}
              <a href={pro.mapsUrl} target="_blank" rel="noreferrer" className="font-bold underline">
                See them all on Google Maps
              </a>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
