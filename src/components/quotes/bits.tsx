"use client";
import { Check, Copy, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";

/** Copies text to the clipboard and says so for a moment. */
export function CopyButton({
  text,
  children,
  variant = "outline",
  size = "sm",
  onCopied,
}: {
  text: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "dark";
  size?: "sm" | "md";
  onCopied?: () => void;
}) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers and non-https pages: fall back to a hidden textarea.
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setDone(true);
    onCopied?.();
    setTimeout(() => setDone(false), 1800);
  }
  return (
    <Button type="button" variant={variant} size={size} onClick={copy}>
      {done ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {done ? "Copied" : children}
    </Button>
  );
}

/** Bottom sheet on phones, centered dialog on desktop. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pop max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border-2 border-ink bg-white p-5 sm:max-w-xl sm:rounded-2xl sm:shadow-hard"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-2xl font-extrabold leading-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 cursor-pointer rounded-lg p-2 hover:bg-ink/5"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SectionTitle({ step, title, sub, action }: { step?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {step && <p className="text-xs font-extrabold uppercase tracking-wide text-mute">{step}</p>}
        <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
        {sub && <p className="mt-1 max-w-2xl text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
