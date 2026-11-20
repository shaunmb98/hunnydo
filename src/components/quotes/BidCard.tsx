"use client";
import { deleteDoc, updateDoc } from "firebase/firestore";
import { BellRing, ChevronDown, Globe, Mail, MessageSquare, Phone, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, ErrorNote, LinkButton, Stars, Textarea } from "@/components/ui";
import { bidRef, clean } from "@/lib/db";
import { moneyRange, timeAgo } from "@/lib/format";
import {
  STATUS_META,
  followUpNote,
  mailtoHref,
  needsFollowUp,
  smsHref,
  telHref,
  type BoardBid,
} from "@/lib/quotes-shared";
import type { BidStatus, Job } from "@/lib/types";
import { CopyButton } from "./bits";

/** One pro on the board: how to reach them, what you're sending, where things stand. */
export function BidCard({
  uid,
  job,
  bid,
  locked,
  onLogQuote,
  onHire,
}: {
  uid: string;
  job: Job;
  bid: BoardBid;
  locked: boolean; // job already booked: no more status changes
  onLogQuote: (bid: BoardBid) => void;
  onHire: (bid: BoardBid) => void;
}) {
  const meta = STATUS_META[bid.status];
  const [open, setOpen] = useState(bid.status === "drafted");
  const [message, setMessage] = useState(bid.message ?? "");
  const [textMessage, setTextMessage] = useState(bid.textMessage ?? "");
  const [notes, setNotes] = useState(bid.notes ?? "");
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Pick up edits made elsewhere (another tab, the server) without clobbering what's being typed.
  useEffect(() => setMessage(bid.message ?? ""), [bid.message]);
  useEffect(() => setTextMessage(bid.textMessage ?? ""), [bid.textMessage]);
  useEffect(() => setNotes(bid.notes ?? ""), [bid.notes]);

  const ref = bidRef(uid, job.id, bid.id);
  const title = job.diagnosis?.title ?? job.title;

  async function save(patch: Partial<BoardBid>, event?: string) {
    setError("");
    try {
      const now = Date.now();
      await updateDoc(
        ref,
        clean({
          ...patch,
          updatedAt: now,
          ...(event ? { events: [...(bid.events ?? []), { at: now, text: event }] } : {}),
        }),
      );
    } catch {
      setError("That didn't save. Check your connection and try again.");
    }
  }

  const setStatus = (status: BidStatus, event: string, extra: Partial<BoardBid> = {}) => save({ status, ...extra }, event);
  const reachedOut = (how: string) =>
    setStatus("contacted", how, { contactedAt: bid.contactedAt ?? Date.now(), followUpAt: Date.now() + 24 * 60 * 60 * 1000 });

  async function remove() {
    try {
      await deleteDoc(ref);
    } catch {
      setError("Couldn't remove them. Try again.");
    }
  }

  const q = bid.quote;
  const followUp = !locked && needsFollowUp(bid);
  const canLog = !locked && (bid.status === "drafted" || bid.status === "contacted" || bid.status === "no_response");
  const body = message || bid.message || "";
  const sms = textMessage || body;

  return (
    <Card flat={bid.status === "declined"} className={bid.status === "declined" ? "min-w-0 bg-paper p-4" : "min-w-0 p-4 sm:p-5"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-tight">{bid.proName}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
            <Stars rating={bid.proRating} count={bid.proReviewCount} />
            {bid.proPhone && <span>{bid.proPhone}</span>}
            {bid.source === "board" && <Badge tone="blue">From the job board</Badge>}
            {bid.source === "board" && !bid.claimVerified && (
              <span title="Whoever sent this bid claimed the listing but hasn't proved they own it yet. Call the number on the listing to confirm.">
                <Badge tone="amber">Not verified yet</Badge>
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <p className="mt-1 text-xs text-mute">{timeAgo(bid.updatedAt)}</p>
        </div>
      </div>

      {followUp && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-honey-soft px-3 py-2">
          <p className="flex items-center gap-2 text-sm font-bold">
            <BellRing className="h-4 w-4 shrink-0" aria-hidden />
            It&apos;s been over a day. Worth a nudge.
          </p>
          <div className="flex flex-wrap gap-2">
            {bid.proPhone && (
              <LinkButton href={smsHref(bid.proPhone, followUpNote(bid, title))} size="sm" variant="outline">
                Text a follow-up
              </LinkButton>
            )}
            <CopyButton text={followUpNote(bid, title)} onCopied={() => save({}, "Copied a follow-up note")}>
              Copy follow-up
            </CopyButton>
          </div>
        </div>
      )}

      {q && (
        <div className="mt-3 rounded-md border border-line bg-go-soft px-3 py-2">
          <p className="font-display text-2xl font-bold">{moneyRange(q.amountLow, q.amountHigh) || "Price not given"}</p>
          <p className="text-sm text-ink-soft">
            {[q.availability, q.warranty && `Warranty: ${q.warranty}`].filter(Boolean).join(" · ") || "No timing given yet"}
          </p>
        </div>
      )}

      {bid.status !== "declined" && bid.status !== "hired" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {bid.proPhone && (
            <>
              <LinkButton href={telHref(bid.proPhone)} size="sm" variant={bid.status === "drafted" ? "primary" : "outline"}>
                <Phone className="h-4 w-4" aria-hidden /> Call
              </LinkButton>
              <LinkButton href={smsHref(bid.proPhone, sms)} size="sm" variant="outline">
                <MessageSquare className="h-4 w-4" aria-hidden /> Text
              </LinkButton>
            </>
          )}
          {bid.proEmail ? (
            <LinkButton href={mailtoHref(bid.proEmail, bid.subject ?? title, body)} size="sm" variant="outline">
              <Mail className="h-4 w-4" aria-hidden /> Email
            </LinkButton>
          ) : (
            <>
              <CopyButton text={body}>Copy message</CopyButton>
              {bid.proWebsite && (
                <LinkButton href={bid.proWebsite} size="sm" variant="ghost" external>
                  <Globe className="h-4 w-4" aria-hidden /> Their website
                </LinkButton>
              )}
            </>
          )}
          {bid.callScript && <CopyButton text={bid.callScript} variant="ghost">Copy call script</CopyButton>}
        </div>
      )}
      {!bid.proPhone && !bid.proEmail && bid.status === "drafted" && (
        <p className="mt-2 text-xs text-mute">
          No phone or email on file. Copy the message and paste it into the contact form on their website.
        </p>
      )}

      {bid.status !== "hired" && bid.status !== "declined" && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex cursor-pointer items-center gap-1 text-sm font-bold underline underline-offset-4"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            {open ? "Hide what you're sending" : "See and edit what you're sending"}
          </button>
          {open && (
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-mute">
                  Email or contact form{bid.subject ? ` · ${bid.subject}` : ""}
                </span>
                <Textarea
                  rows={9}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onBlur={() => message !== (bid.message ?? "") && save({ message })}
                />
              </label>
              <label className="block">
                <span className="mb-1 flex justify-between text-xs font-bold text-mute">
                  <span>Text message</span>
                  <span className={textMessage.length > 320 ? "text-stop" : ""}>{textMessage.length} / 320</span>
                </span>
                <Textarea
                  rows={4}
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  onBlur={() => textMessage !== (bid.textMessage ?? "") && save({ textMessage })}
                />
              </label>
              {bid.callScript && (
                <div className="rounded-md border border-dashed border-line bg-paper p-3">
                  <p className="mb-1 text-xs font-bold text-mute">
                    If they pick up, or for a voicemail
                  </p>
                  <p className="text-[15px] leading-relaxed">{bid.callScript}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!locked && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-dashed border-line pt-4">
          {bid.status === "drafted" && (
            <Button size="sm" variant="dark" onClick={() => reachedOut("Reached out")}>I reached out</Button>
          )}
          {bid.status === "no_response" && (
            <Button size="sm" variant="dark" onClick={() => reachedOut("Tried again")}>I tried again</Button>
          )}
          {bid.status === "quoted" && (
            <>
              <Button variant="outline" size="sm" onClick={() => onHire(bid)}>Go with {bid.proName}</Button>
              <Button size="sm" variant="outline" onClick={() => onLogQuote(bid)}>Edit quote</Button>
            </>
          )}
          {canLog && (
            <Button size="sm" variant={bid.status === "contacted" ? "primary" : "outline"} onClick={() => onLogQuote(bid)}>
              Log their quote
            </Button>
          )}
          {bid.status === "contacted" && (
            <Button size="sm" variant="outline" onClick={() => setStatus("no_response", "No answer")}>No answer</Button>
          )}
          {bid.status !== "declined" && bid.status !== "hired" && (
            <Button size="sm" variant="ghost" onClick={() => setStatus("declined", "Marked not a fit")}>Not a fit</Button>
          )}
          {bid.status === "declined" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatus(q ? "quoted" : bid.contactedAt ? "contacted" : "drafted", "Put back on the board")}
            >
              Put back
            </Button>
          )}
          {bid.status !== "hired" &&
            (confirmRemove ? (
              <span className="flex items-center gap-2 text-sm">
                <Button size="sm" variant="danger" onClick={remove}>Yes, remove</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>Keep</Button>
              </span>
            ) : (
              <Button size="sm" variant="ghost" className="text-mute" onClick={() => setConfirmRemove(true)} aria-label={`Remove ${bid.proName} from the board`}>
                <Trash2 className="h-4 w-4" aria-hidden /> Remove
              </Button>
            ))}
        </div>
      )}

      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-bold text-mute">Your notes (only you see these)</span>
          <Textarea
            rows={2}
            className="min-h-0 text-sm"
            placeholder="Spoke to Dale. Sounded rushed. Calling back after lunch."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (bid.notes ?? "") && save({ notes })}
          />
        </label>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold text-mute">History</p>
          <ul className="space-y-0.5 text-sm text-ink-soft">
            {[...(bid.events ?? [])].reverse().slice(0, 4).map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{e.text}</span>
                <span className="shrink-0 text-xs text-mute">{timeAgo(e.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
