"use client";
import { setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Input } from "@/components/ui";
import { userRef } from "@/lib/db";

/** The number pros should call or text back. It goes into every message and call script, never onto the job board. */
export function CallbackNumber() {
  const { user, profile } = useAuth();
  const saved = profile?.phone ?? "";
  const [phone, setPhone] = useState(saved);
  const [state, setState] = useState<"" | "saved" | "error">("");
  useEffect(() => setPhone(saved), [saved]);

  async function save() {
    const next = phone.trim().slice(0, 30);
    if (!user || next === saved) return;
    try {
      await setDoc(userRef(user.uid), { phone: next }, { merge: true });
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-white px-4 py-3">
      <label htmlFor="callback" className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">Your callback number</span>
        <span className="block text-sm text-ink-soft">
          Goes into the messages and call script so pros can reach you. It&apos;s never shown on the job board.
        </span>
      </label>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Input
          id="callback"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(602) 555-0142"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setState("");
          }}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="sm:w-48"
        />
        <span className="w-12 text-sm font-semibold" aria-live="polite">
          {state === "saved" && <span className="text-go">Saved</span>}
          {state === "error" && <span className="text-stop">Retry</span>}
        </span>
      </div>
    </div>
  );
}
