"use client";
import { Check, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { setCrew } from "@/lib/pros-client";

/** Add to crew / In crew toggle. */
export function CrewButton({
  uid,
  proId,
  inCrew,
  size = "sm",
}: {
  uid: string;
  proId: string;
  inCrew: boolean;
  size?: "sm" | "md";
}) {
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await setCrew(uid, proId, !inCrew);
    } catch (err) {
      console.error("[crew]", err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button
      size={size}
      variant={inCrew ? "dark" : "primary"}
      onClick={toggle}
      disabled={busy}
      aria-pressed={inCrew}
      title={inCrew ? "Remove from my crew" : "Save to my crew"}
    >
      {inCrew ? <Check className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
      {inCrew ? "In crew" : "Add to crew"}
    </Button>
  );
}
