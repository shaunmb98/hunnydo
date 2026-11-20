"use client";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Textarea } from "@/components/ui";
import { saveNotes } from "@/lib/pros-client";

/** Private notes on a pro. Saves on blur or with the button. */
export function NotesEditor({
  uid,
  proId,
  value,
  rows = 3,
  placeholder = "Gate code, who you talked to, what they charged last time...",
}: {
  uid: string;
  proId: string;
  value?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState(value ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = text !== (value ?? "");

  // Pick up changes made elsewhere, but never clobber what is being typed.
  useEffect(() => {
    setText((cur) => (state === "saving" || cur === (value ?? "") ? cur : dirty ? cur : value ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  async function save() {
    if (!dirty) return;
    setState("saving");
    try {
      await saveNotes(uid, proId, text.trim());
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <Textarea
        aria-label="Private notes"
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setState("idle");
        }}
        onBlur={save}
        placeholder={placeholder}
        className="min-h-0"
      />
      <div className="mt-1.5 flex min-h-8 items-center gap-3 text-xs">
        {dirty && state !== "saving" && (
          <Button size="sm" variant="outline" onClick={save} type="button">
            Save note
          </Button>
        )}
        {state === "saving" && <span className="text-mute">Saving</span>}
        {state === "saved" && !dirty && (
          <span className="inline-flex items-center gap-1 font-bold text-go">
            <Check className="h-3.5 w-3.5" aria-hidden /> Saved
          </span>
        )}
        {state === "error" && <span className="font-bold text-stop">Couldn&apos;t save. Try again.</span>}
        {state === "idle" && !dirty && <span className="text-mute">Only you can see these.</span>}
      </div>
    </div>
  );
}
