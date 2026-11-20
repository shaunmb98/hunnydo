import { FieldValue } from "firebase-admin/firestore";
import { HttpError, adminDb, bidsCol, handler, jobsCol, prosCol } from "@/lib/admin";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { money, moneyRange } from "@/lib/format";
import { loadBids, loadJob, loadPro, loadProfile } from "@/lib/quotes-server";
import { quoteMid } from "@/lib/quotes-shared";

/** POST /api/quotes/hire {jobId, proId, scheduledFor?, amount?} -> {ok, emailed} */
export const POST = handler<{ jobId?: string; proId?: string; scheduledFor?: string; amount?: number }>(
  async ({ uid, email, body }) => {
    const job = await loadJob(uid, body.jobId);
    if (typeof body.proId !== "string" || !body.proId) throw new HttpError(400, "Which pro are you going with?");
    const bids = await loadBids(uid, job.id);
    const bid = bids.find((b) => b.id === body.proId);
    if (!bid) throw new HttpError(404, "That pro isn't on this job's board.");
    if (job.hiredProId && job.hiredProId !== bid.id)
      throw new HttpError(409, `You already booked ${job.hiredProName ?? "someone"} for this job.`);
    const alreadyHired = bid.status === "hired";

    const [pro, profile] = await Promise.all([loadPro(uid, bid.id), loadProfile(uid)]);
    const q = bid.quote;
    const agreed = typeof body.amount === "number" && body.amount > 0 ? body.amount : undefined;
    // A repeat call for the same pro keeps what was already agreed unless new values are sent.
    const hiredAmount =
      agreed ??
      (alreadyHired ? job.hiredAmount : undefined) ??
      (q?.amountLow != null && q.amountLow === q.amountHigh ? q.amountLow : quoteMid(q));
    const scheduledFor =
      (typeof body.scheduledFor === "string" && body.scheduledFor.trim()) ||
      (alreadyHired ? job.scheduledFor : undefined) ||
      q?.availability ||
      undefined;
    const now = Date.now();

    const batch = adminDb.batch();
    batch.update(bidsCol(uid, job.id).doc(bid.id), {
      status: "hired",
      updatedAt: now,
      ...(alreadyHired ? {} : { events: FieldValue.arrayUnion({ at: now, text: "Hired for the job" }) }),
    });
    let declined = 0;
    for (const other of bids) {
      if (other.id === bid.id || other.status === "declined" || other.status === "hired") continue;
      declined++;
      batch.update(bidsCol(uid, job.id).doc(other.id), {
        status: "declined",
        updatedAt: now,
        events: FieldValue.arrayUnion({ at: now, text: `Passed: went with ${bid.proName}` }),
      });
    }
    batch.update(jobsCol(uid).doc(job.id), {
      status: "scheduled",
      hiredProId: bid.id,
      hiredProName: bid.proName,
      hiredAmount: hiredAmount ?? FieldValue.delete(),
      scheduledFor: scheduledFor ?? FieldValue.delete(),
      updatedAt: now,
    });
    if (pro) {
      batch.update(prosCol(uid).doc(bid.id), {
        inCrew: true,
        ...(alreadyHired ? {} : { jobsCount: FieldValue.increment(1) }),
      });
    }
    await batch.commit();

    // Confirmation goes to the homeowner only. HunnyDo never emails the business.
    const to = email ?? profile?.email;
    let emailed = false;
    if (to && !alreadyHired) {
      const phone = bid.proPhone ?? pro?.phone;
      const price = agreed != null ? money(agreed) : moneyRange(q?.amountLow, q?.amountHigh) || "Not confirmed yet";
      const fee =
        q?.serviceFee == null
          ? ""
          : `${money(q.serviceFee)}${q.serviceFeeWaivedIfHired ? " (credited toward the work)" : q.serviceFeeWaivedIfHired === false ? " (charged either way)" : ""}`;
      const rows: [string, string][] = [
        ["Who", bid.proName],
        ["When", scheduledFor ?? "Not set yet. Confirm a time with them."],
        ["Price", price],
      ];
      if (fee) rows.push(["Service fee", fee]);
      if (phone) rows.push(["Their phone", phone]);
      if (q?.warranty) rows.push(["Warranty", q.warranty]);
      const title = job.diagnosis?.title ?? job.title;
      const list = (label: string, items?: string[]) =>
        items?.length
          ? `<p style="margin:16px 0 4px;font-weight:700">${label}</p><ul style="margin:0;padding-left:20px">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`
          : "";
      const html = emailLayout(
        `You're booked: ${escapeHtml(bid.proName)}`,
        `<p style="margin:0 0 16px">Here's what you agreed for <strong>${escapeHtml(title)}</strong>. Keep this handy for the day they come out.</p>
<table style="width:100%;border-collapse:collapse">${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid #D9DBE1;color:#4B4B57;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:8px 0;border-top:1px solid #D9DBE1;font-weight:700">${escapeHtml(v)}</td></tr>`,
          )
          .join("")}</table>
${list("What's included", q?.includes)}${list("Not included", q?.excludes)}
<p style="margin:16px 0 0;color:#4B4B57">${escapeHtml(bid.proName)} is in your crew now, so they're one tap away next time.</p>`,
      );
      const text = [
        `You're booked with ${bid.proName} for ${title}.`,
        ...rows.map(([k, v]) => `${k}: ${v}`),
        q?.includes?.length ? `Included: ${q.includes.join("; ")}` : "",
        q?.excludes?.length ? `Not included: ${q.excludes.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      emailed = (await sendEmail({ to, subject: `You're booked: ${bid.proName} for ${title}`, html, text })).sent;
    }
    return { ok: true, emailed, declined, hiredAmount: hiredAmount ?? null, scheduledFor: scheduledFor ?? null };
  },
);
