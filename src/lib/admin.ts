import "server-only";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

// On Cloud Run this uses the service's own identity. Locally it reads GOOGLE_APPLICATION_CREDENTIALS.
const adminApp =
  getApps()[0] ??
  initializeApp({ credential: applicationDefault(), projectId: "hunnydo-app" });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch {
  // settings() can only be called once; safe to ignore on hot reload
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Verify the Firebase ID token on a request and return the caller's uid. */
export async function requireUser(req: Request): Promise<{ uid: string; email?: string }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Sign in first.");
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    throw new HttpError(401, "Your session expired. Sign in again.");
  }
}

// Every route here costs money (Claude or Google Places), so each signed-in user gets a per-minute budget.
// In-memory is enough for a single small Cloud Run service; a shared store would replace it at scale.
const RATE_LIMIT = 40;
const hits = new Map<string, { windowStart: number; count: number }>();
function checkRate(uid: string) {
  const now = Date.now();
  const h = hits.get(uid);
  if (!h || now - h.windowStart > 60_000) {
    hits.set(uid, { windowStart: now, count: 1 });
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.windowStart > 60_000) hits.delete(k);
    return;
  }
  if (++h.count > RATE_LIMIT) throw new HttpError(429, "You're going a little fast. Give it a minute and try again.");
}

/** Wrap a route handler: auth, rate limit, JSON body, consistent error shape. */
export function handler<T>(
  fn: (ctx: { uid: string; email?: string; body: T; req: Request }) => Promise<unknown>,
) {
  return async (req: Request) => {
    try {
      const user = await requireUser(req);
      checkRate(user.uid);
      const raw = req.method === "GET" ? {} : await req.json().catch(() => ({}));
      const body = (raw && typeof raw === "object" ? raw : {}) as T;
      const result = await fn({ ...user, body, req });
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      // Only messages we wrote ourselves go back to the browser. Anything else stays in the server log.
      const message = err instanceof HttpError ? err.message : "Something went wrong on our end. Try again.";
      if (status === 500) console.error("[api]", req.url, err);
      return NextResponse.json({ error: message }, { status });
    }
  };
}

export const userDoc = (uid: string) => adminDb.collection("users").doc(uid);
export const prosCol = (uid: string) => userDoc(uid).collection("pros");
export const jobsCol = (uid: string) => userDoc(uid).collection("jobs");
export const bidsCol = (uid: string, jobId: string) => jobsCol(uid).doc(jobId).collection("bids");
