"use client";
import { Check, Phone, Plus, UserMinus, Users, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TradeIcon } from "@/components/pros/TradeIcon";
import { useAuth } from "@/components/AuthProvider";
import { AddProForm } from "@/components/pros/AddProForm";
import { NotesEditor } from "@/components/pros/NotesEditor";
import { Badge, Button, Card, LinkButton, PageHeader, Spinner, Stars } from "@/components/ui";
import { usePros } from "@/lib/db";
import { cx } from "@/lib/format";
import { plural, setCrew, telHref } from "@/lib/pros-client";
import { TRADES } from "@/lib/trades";

export default function CrewPage() {
  const { user } = useAuth();
  const { data: pros, loading } = usePros(user?.uid);
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState("");

  const crew = useMemo(() => pros.filter((p) => p.inCrew).sort((a, b) => a.name.localeCompare(b.name)), [pros]);
  const byTrade = useMemo(() => TRADES.map((t) => ({ trade: t, members: crew.filter((p) => p.trade === t.id) })).filter((g) => g.trade.core || g.members.length), [crew]);
  const covered = byTrade.filter((g) => g.members.length).length;

  if (!user || loading) return <Spinner label="Gathering your crew" />;

  return (
    <>
      <PageHeader
        title="My crew"
        subtitle="The people you'd call again. One list, so you never dig through old texts for that plumber's number."
        action={
          <Button onClick={() => setAdding(!adding)} variant={adding ? "outline" : "primary"}>
            {adding ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            {adding ? "Close" : "Add your own"}
          </Button>
        }
      />

      {adding && (
        <Card className=" mb-6 p-5">
          <h2 className="text-xl font-bold">Add someone you trust</h2>
          <p className="mb-4 mt-0.5 text-sm text-ink-soft">Your brother-in-law&apos;s electrician counts.</p>
          <AddProForm
            uid={user.uid}
            onAdded={(p) => {
              setJustAdded(p.name);
              setAdding(false);
            }}
          />
        </Card>
      )}
      {justAdded && !adding && (
        <p className="mb-4 text-sm font-bold text-go" role="status">
          {justAdded} is in your crew.
        </p>
      )}

      <section aria-label="Coverage" className="mb-8">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">Who you&apos;ve got covered</h2>
          <span className="text-sm font-bold text-ink-soft">{covered} of 8 trades</span>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {byTrade.map(({ trade: t, members }) => {
            const has = members.length > 0;
            return (
              <li
                key={t.id}
                className={cx("flex items-center gap-2 rounded-md border px-3 py-2", has ? "border-line bg-go-soft" : "border-dashed border-line/40 bg-white")}
              >
                <TradeIcon id={t.id} tile />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold leading-tight">{t.label}</span>
                  {has ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-go">
                      <Check className="h-3 w-3" aria-hidden /> {members.length} saved
                    </span>
                  ) : (
                    <Link href={`/pros?trade=${t.id}`} className="text-xs font-bold text-sky underline">
                      Find one
                    </Link>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {crew.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center " aria-hidden>
              <Users className="h-8 w-8" />
            </div>
            <h2 className="mt-3 text-2xl font-bold">Nobody on the crew yet</h2>
            <p className="mx-auto mt-2 max-w-md text-ink-soft">
              When a pro does right by you, save them here. Next time something breaks you call one number instead of
              fifteen.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <LinkButton href="/pros" size="lg">
                Browse local pros
              </LinkButton>
              <Button size="lg" variant="outline" onClick={() => setAdding(true)}>
                <Plus className="h-5 w-5" aria-hidden /> Add someone I already use
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {byTrade
            .filter((g) => g.members.length)
            .map(({ trade: t, members }) => (
              <section key={t.id}>
                <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
                  <TradeIcon id={t.id} tile /> {t.label}
                  <span className="text-base font-bold text-mute">{plural(members.length, "pro")}</span>
                </h2>
                <ul className="grid gap-4 lg:grid-cols-2">
                  {members.map((p) => (
                    <li key={p.id}>
                      <Card className="flex h-full flex-col p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/pros/${p.id}`} className="block break-words text-lg font-bold leading-tight hover:underline">
                              {p.name}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                              {p.source === "manual" ? <Badge>Added by you</Badge> : <Stars rating={p.rating} count={p.reviewCount} />}
                              {p.phone && <span>{p.phone}</span>}
                              {p.distanceMi != null && <span>{p.distanceMi} mi</span>}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <NotesEditor uid={user.uid} proId={p.id} value={p.notes} rows={2} placeholder="Add a note: what they fixed, what it cost, who to ask for..." />
                        </div>
                        <div className="mt-auto flex flex-wrap gap-2 pt-2">
                          {p.phone && (
                            <LinkButton href={telHref(p.phone)} size="sm">
                              <Phone className="h-4 w-4" aria-hidden /> Call
                            </LinkButton>
                          )}
                          {p.email && (
                            <LinkButton href={`mailto:${p.email}`} size="sm" variant="outline">
Email
                            </LinkButton>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto text-ink-soft"
                            onClick={() => setCrew(user.uid, p.id, false).catch((e) => console.error("[crew]", e))}
                          >
                            <UserMinus className="h-4 w-4" aria-hidden /> Remove
                          </Button>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </>
  );
}
