"use client";
import { auth } from "./firebase";

/** Call one of our API routes as the signed-in user. Throws Error(message) on failure. */
export async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}
