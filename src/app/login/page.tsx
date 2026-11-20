"use client";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button, Card, ErrorNote, Field, Input, Logo } from "@/components/ui";
import { userRef } from "@/lib/db";
import { auth } from "@/lib/firebase";

const FRIENDLY: Record<string, string> = {
  "auth/invalid-credential": "That email and password don't match. Try again.",
  "auth/email-already-in-use": "There's already an account with that email. Sign in instead.",
  "auth/weak-password": "Pick a password with at least 6 characters.",
  "auth/invalid-email": "That doesn't look like an email address.",
  "auth/too-many-requests": "Too many tries. Wait a minute and try again.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading } = useAuth();
  const [mode, setMode] = useState<"signup" | "signin">(params.get("mode") === "signin" ? "signin" : "signup");
  const next = params.get("next") ?? "";
  const forPro = next.startsWith("/biz");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (loading || !user) return;
    // Pros arrive with ?next=/biz/claim and never need a home address. Only in-app business paths are honored.
    if (next.startsWith("/biz")) return router.replace(next);
    if ((profile as { businessId?: string } | null)?.businessId && !profile?.home) return router.replace("/biz");
    router.replace(profile?.home ? "/home" : "/onboarding");
  }, [loading, user, profile, router, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
        await setDoc(userRef(cred.user.uid), { email: email.trim(), name: name.trim() }, { merge: true });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setError(FRIENDLY[code] ?? "Couldn't sign you in. Try again.");
      setBusy(false);
    }
  }

  async function reset() {
    if (!email.trim()) return setError("Type your email above first, then press reset.");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice("Check your inbox for a reset link.");
    } catch {
      setError("Couldn't send a reset email to that address.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6">
        <Logo size="lg" />
      </Link>
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">
          {mode === "signup" ? (forPro ? "Set up your business" : "Start your home's crew list") : "Welcome back"}
        </h1>
        <p className="mt-1 text-ink-soft">
          {mode === "signup"
            ? forPro
              ? "Free. Make an account, then find your listing."
              : "Free. Takes about a minute."
            : "Your jobs and your crew are waiting."}
        </p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "signup" && (
            <Field label="First name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="Shaun" />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
          </Field>
          <Field label="Password" hint={mode === "signup" ? "At least 6 characters." : undefined}>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          {notice && <p className="text-sm font-semibold text-go">{notice}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            {mode === "signup" ? "Create my account" : "Sign in"}
          </Button>
        </form>
        <div className="mt-5 flex items-center justify-between text-sm">
          <button className="font-bold underline cursor-pointer" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}>
            {mode === "signup" ? "I already have an account" : "Create an account"}
          </button>
          {mode === "signin" && (
            <button className="text-ink-soft underline cursor-pointer" onClick={reset}>
              Reset password
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
