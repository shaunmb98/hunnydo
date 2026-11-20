import "server-only";
import { Resend } from "resend";

const FROM = "HunnyDo <hello@mail.doithunny.com>";

/**
 * Send a transactional email to the signed-in homeowner.
 * HunnyDo never emails a business directly; the homeowner sends outreach themselves.
 * Never throws: if the sending domain isn't verified yet, the caller gets { sent: false }.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string; text?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false as const, reason: "Email is not configured." };
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from: FROM, ...opts });
    if (error) {
      console.warn("[email]", error.message);
      return { sent: false as const, reason: error.message };
    }
    return { sent: true as const };
  } catch (err) {
    console.warn("[email]", err);
    return { sent: false as const, reason: "Email service unavailable." };
  }
}

/** Shared wrapper so every email looks like HunnyDo. */
export function emailLayout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#F3F4F6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#17171C">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="font-size:22px;font-weight:800;margin-bottom:16px"><span style="background:#FFC629;border:2px solid #17171C;border-radius:8px;padding:2px 8px">Hunny</span>Do</div>
  <div style="background:#fff;border:2px solid #17171C;border-radius:14px;padding:24px">
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    ${bodyHtml}
  </div>
  <p style="font-size:12px;color:#6B7280;margin-top:16px">Sent by HunnyDo, your home's to-do list with a crew attached. doithunny.com</p>
</div></body></html>`;
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
