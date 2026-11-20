import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { z } from "zod";
import { handler, HttpError, jobsCol, userDoc } from "@/lib/admin";
import { structured, type ImageInput } from "@/lib/ai";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { TRADE_IDS, TRADES, URGENCY } from "@/lib/trades";
import type { Diagnosis, UserProfile } from "@/lib/types";
import type { JobDoc } from "@/lib/jobs-extra";

export const runtime = "nodejs";
export const maxDuration = 120;

const BUCKET = "hunnydo-app.firebasestorage.app";
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const DiagnosisSchema = z.object({
  title: z.string().describe("Short name for the job, 3 to 7 words, e.g. 'Leaking main water line'. No trailing period."),
  summary: z.string().describe("2 to 4 plain-English sentences on what is going on. If the photo does not show a home repair problem, say so plainly here."),
  likelyCause: z.string().describe("The single most likely cause, with a short why. Mention a runner-up cause if it is a real possibility."),
  trade: z.enum(TRADE_IDS).describe("The trade that should be called first."),
  urgency: z.enum(["emergency", "soon", "routine"]),
  urgencyReason: z.string().describe("One sentence on why it is that urgent, including what happens if it sits."),
  confidence: z.enum(["low", "medium", "high"]),
  photoObservations: z.array(z.string()).describe("What you can actually see in the photo, one concrete observation each. Empty if there is no photo and no earlier observations."),
  safetySteps: z.array(z.string()).describe("2 to 5 things to do right now, in order, each one short imperative sentence."),
  diyFeasible: z.boolean(),
  diyNotes: z.string().describe("Honest take on doing it yourself: skill, tools, permit or code issues, and where it goes wrong."),
  costLow: z.number().describe("Low end of a realistic total cost in whole US dollars to hire a pro."),
  costHigh: z.number().describe("High end of a realistic total cost in whole US dollars to hire a pro."),
  costNotes: z.string().describe("What drives the price toward the low or high end, and any typical service-call fee."),
  questionsProsWillAsk: z.array(z.string()).describe("4 to 7 questions a pro will ask on the phone."),
  termsToKnow: z.array(z.string()).describe("3 to 6 entries formatted exactly as 'term: meaning'."),
  jobBrief: z.string().describe("First-person, ready-to-send write-up of the problem, 4 to 7 sentences."),
  redFlags: z.array(z.string()).describe("3 to 5 things to watch out for in quotes for this kind of job."),
}) satisfies z.ZodType<Diagnosis>;

const SYSTEM = `You are HunnyDo's diagnosis assistant. Think and talk like a seasoned, honest general contractor with 30 years in the trades who is helping a neighbor over the fence. You are not selling anything. The homeowner is about to call several pros and is tired of explaining the same problem over and over, so your write-up has to be good enough to send as is.

How to work:
- If there is a photo, start from what you can actually see in it and list those observations. Never invent details that are not visible or stated. If the photo does not show a home repair problem (a pet, a selfie, a blank wall), say so plainly in the summary, set confidence to "low", leave the photo observations to what is really there, and still do your best with the written description.
- Name the single most likely cause. If you cannot tell between two causes from here, say what a pro would check to tell them apart.
- Pick exactly one trade to call first from: ${TRADES.map((t) => `${t.id} (${t.examples})`).join("; ")}.
- Urgency: "emergency" (${URGENCY.emergency.blurb.toLowerCase()}: active leak, no cooling in extreme heat, sparking or burning smell, gas, sewage, anything unsafe), "soon" (this week, it will get worse or more expensive), "routine" (schedule when convenient). Give the reason.
- Safety steps are what to do right now, before anyone arrives: which shut-off valve or breaker and where it usually is, what to keep away from, what to photograph for the pro. If there is any sign of a gas leak, the first step is to leave the house and call the gas utility or 911 from outside, and not to flip switches. For downed lines, burning smells from a panel, or water near live electrics, say when to call the utility or 911. Do not pad the list with generic advice.
- DIY: be honest. Say yes only if a careful homeowner with basic tools can realistically do it safely and legally. Gas, panel work, main lines, roof work and refrigerant are not DIY.
- Cost: a realistic range in US dollars for hiring a licensed pro for the most likely repair in the homeowner's area. Use the home city given; if none is given, price for the Phoenix, Arizona area. Whole dollars, low below high, and not so wide it is useless. Explain what moves it.
- Questions pros will ask: the real ones (age and brand of equipment, where the shut-off is, when it started, access, owner or renter, whether anyone has worked on it).
- Terms to know: vocabulary that helps the homeowner sound informed on the phone, each formatted as "term: meaning".
- Red flags: specific to this kind of job (for example quoting a full replacement without testing, a big cash deposit, no permit where one is required).

The job brief is the most important field. Write it in first person as the homeowner, ready to paste into an email or read over the phone. 4 to 7 sentences, plain text, no greeting, no sign-off, no bullet points. Cover: what the problem is and where, what was observed (from the photo and the description), what has already been done about it, and what the homeowner wants: a quote and the earliest availability. Mention their service-call fee preference and their availability if given. Only for access details a pro needs that you do not know (gate code, pets, parking, where the equipment is), leave a short blank in square brackets like [gate code] for the homeowner to fill in. Do not use blanks for anything you were told. Do not include the home address.

Writing style everywhere: plain, warm, direct. Short sentences. No hedging filler, no exclamation marks, no marketing words, no em dashes.`;

type Body = {
  jobId?: string;
  description?: string;
  extraDetail?: string;
  image?: { data?: string; mediaType?: string };
};

function parseImage(image: Body["image"]): ImageInput | null {
  if (!image?.data) return null;
  const mediaType = MEDIA_TYPES.find((m) => m === image.mediaType);
  if (!mediaType) throw new HttpError(400, "That photo format isn't supported. Use a JPG or PNG.");
  const data = image.data.replace(/^data:[^,]+,/, "");
  if (data.length > 7_000_000) throw new HttpError(413, "That photo is too large. Try a smaller one.");
  return { data, mediaType };
}

/** For retries: pull the stored photo back out of Storage so the caller doesn't have to re-send it. */
async function storedPhoto(uid: string, path?: string): Promise<ImageInput | null> {
  if (!path || !path.startsWith(`users/${uid}/`)) return null;
  try {
    const [buf] = await getStorage().bucket(BUCKET).file(path).download();
    if (buf.length > 5_000_000) return null;
    return { data: buf.toString("base64"), mediaType: "image/jpeg" };
  } catch (err) {
    console.warn("[diagnose] could not read stored photo", err);
    return null;
  }
}

export const POST = handler<Body>(async ({ uid, email, body }) => {
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!jobId || jobId.includes("/")) throw new HttpError(400, "Missing job.");

  const ref = jobsCol(uid).doc(jobId);
  const [jobSnap, userSnap] = await Promise.all([ref.get(), userDoc(uid).get()]);
  // Jobs live under the caller's own user document, so a missing doc also covers "not yours".
  if (!jobSnap.exists) throw new HttpError(404, "We couldn't find that job.");
  const job = jobSnap.data() as JobDoc;
  const profile = (userSnap.data() ?? {}) as Partial<UserProfile>;

  const extraDetail = (body.extraDetail ?? "").trim().slice(0, 2000);
  const isRecheck = !!extraDetail && !!job.diagnosis;
  let description = ((body.description ?? "").trim() || job.description || "").slice(0, 6000);
  if (extraDetail) description = `${description}\n\nAdded later: ${extraDetail}`.trim();

  let image = parseImage(body.image);
  if (!image && !job.photoNotes) image = await storedPhoto(uid, job.photoPath);
  if (!description && !image) throw new HttpError(400, "Add a photo or a few words about what's going on.");

  const city = profile.home?.city || (profile.home?.address ? profile.home.address : "");
  const lines = [
    `Home location: ${city || "not given (assume the Phoenix, Arizona area)"}`,
    `Homeowner's description: ${description || "(none given, go by the photo)"}`,
    job.serviceFeeOk === false
      ? "Service-call fee: the homeowner prefers pros who do not charge a service-call or diagnostic fee."
      : `Service-call fee: the homeowner is OK paying a service-call fee${job.maxServiceFee ? ` up to $${job.maxServiceFee}` : ""}.`,
    `When the homeowner is free: ${job.availability?.trim() || "not given"}`,
    image
      ? "A photo from the homeowner is attached."
      : job.photoNotes
        ? `The photo is not attached this time. What you saw in it earlier (reuse these as the photo observations unless the new detail corrects them):\n${job.photoNotes}`
        : "No photo was provided. Leave photoObservations empty.",
  ];
  if (isRecheck && job.diagnosis) {
    lines.push(
      `You diagnosed this earlier as "${job.diagnosis.title}" (${job.diagnosis.trade}, ${job.diagnosis.urgency}). The homeowner has now added detail. Re-check everything with it in mind and change your answer if the detail warrants it.`,
    );
  }

  try {
    const diagnosis: Diagnosis = await structured({
      system: SYSTEM,
      prompt: lines.join("\n\n"),
      schema: DiagnosisSchema,
      images: image ? [image] : undefined,
      effort: "medium",
    });
    let costLow = Math.max(0, Math.round(diagnosis.costLow));
    let costHigh = Math.max(0, Math.round(diagnosis.costHigh));
    if (costLow > costHigh) [costLow, costHigh] = [costHigh, costLow];
    const result: Diagnosis = { ...diagnosis, costLow, costHigh, title: diagnosis.title.trim().replace(/\.$/, "") };

    const stillEarly = job.status === "diagnosing" || job.status === "diagnosed" || !job.status;
    await ref.update({
      diagnosis: result,
      title: result.title,
      trade: result.trade,
      urgency: result.urgency,
      description,
      ...(result.photoObservations.length ? { photoNotes: result.photoObservations.map((o) => `- ${o}`).join("\n").slice(0, 3000) } : {}),
      ...(stillEarly ? { status: "diagnosed" } : {}),
      // A new diagnosis can change the safety steps, so earlier ticks no longer line up.
      ...(job.diagnosis ? { safetyDone: [] } : {}),
      diagnosisError: FieldValue.delete(),
      updatedAt: Date.now(),
    });

    let emailed = false;
    const to = email ?? profile.email;
    if (!job.diagnosis && to && profile.emailUpdates !== false) {
      const sent = await sendEmail({
        to,
        subject: `Your job brief: ${result.title}`,
        html: emailLayout(
          escapeHtml(result.title),
          `<p style="margin:0 0 12px;line-height:1.5">${escapeHtml(result.summary)}</p>
<p style="margin:0 0 6px;font-weight:700">Your job brief, ready to send to any pro:</p>
<div style="background:#FFF3C4;border:2px solid #17171C;border-radius:10px;padding:14px;line-height:1.55;white-space:pre-wrap">${escapeHtml(result.jobBrief)}</div>
<p style="margin:14px 0 0;line-height:1.5">Typical cost: <strong>$${costLow.toLocaleString("en-US")} to $${costHigh.toLocaleString("en-US")}</strong>. ${escapeHtml(result.urgencyReason)}</p>
<p style="margin:16px 0 0"><a href="https://doithunny.com/jobs/${encodeURIComponent(jobId)}" style="display:inline-block;background:#FFC629;border:2px solid #17171C;border-radius:10px;padding:10px 16px;color:#17171C;font-weight:800;text-decoration:none">Open the job and find pros</a></p>`,
        ),
        text: `${result.title}\n\n${result.summary}\n\nYour job brief:\n${result.jobBrief}\n\nTypical cost: $${costLow} to $${costHigh}.`,
      });
      emailed = sent.sent;
    }
    return { ok: true, diagnosis: result, emailed };
  } catch (err) {
    const message = err instanceof HttpError ? err.message : "The diagnosis didn't finish. Try again.";
    if (!(err instanceof HttpError)) console.error("[diagnose]", err);
    await ref
      .update({
        diagnosisError: message,
        ...(job.status === "diagnosing" || !job.status ? { status: "diagnosed" } : {}),
        updatedAt: Date.now(),
      })
      .catch(() => {});
    throw new HttpError(err instanceof HttpError ? err.status : 500, message);
  }
});
