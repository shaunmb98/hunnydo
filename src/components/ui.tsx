"use client";
import { Loader2, Star } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/format";

// HunnyDo UI kit. Thick ink outlines, hard shadows, honey for the one thing you should press.

type Variant = "primary" | "dark" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-[transform,box-shadow,background] duration-100 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky/40 cursor-pointer select-none";
const btnVariant: Record<Variant, string> = {
  primary:
    "bg-honey text-ink border-2 border-ink shadow-hard-sm hover:bg-honey-dark active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
  dark: "bg-ink text-white border-2 border-ink hover:bg-ink-soft",
  outline:
    "bg-white text-ink border-2 border-ink shadow-hard-sm hover:bg-honey-soft active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-white text-stop border-2 border-stop hover:bg-stop-soft",
};
const btnSize: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-[15px]",
  lg: "px-6 py-3.5 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      className={cx(btnBase, btnVariant[variant], btnSize[size], className)}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  const cls = cx(btnBase, btnVariant[variant], btnSize[size], className);
  if (external || /^(https?:|mailto:|tel:|sms:)/.test(href)) {
    return (
      <a href={href} className={cls} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Card({
  className,
  children,
  flat,
  ...rest
}: { className?: string; children: ReactNode; flat?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-2xl border-2 border-ink",
        !/\bbg-/.test(className ?? "") && "bg-white",
        !flat && "shadow-hard",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export type Tone = "neutral" | "honey" | "green" | "red" | "amber" | "blue" | "dark";
const toneCls: Record<Tone, string> = {
  neutral: "bg-paper text-ink-soft border-line",
  honey: "bg-honey-soft text-ink border-honey-dark",
  green: "bg-go-soft text-go border-go/40",
  red: "bg-stop-soft text-stop border-stop/40",
  amber: "bg-warn-soft text-warn border-warn/40",
  blue: "bg-sky-soft text-sky border-sky/40",
  dark: "bg-ink text-white border-ink",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold",
        toneCls[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const fieldCls =
  "w-full rounded-xl border-2 border-ink bg-white px-3.5 py-2.5 text-[15px] placeholder:text-mute focus:outline-none focus:ring-4 focus:ring-honey/60";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldCls, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldCls, "min-h-[96px] leading-relaxed", props.className)} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border-2 border-ink bg-white px-4 py-3 text-left cursor-pointer"
    >
      <span>
        <span className="block text-[15px] font-bold">{label}</span>
        {description && <span className="block text-sm text-ink-soft">{description}</span>}
      </span>
      <span
        className={cx(
          "relative h-7 w-12 shrink-0 rounded-full border-2 border-ink transition-colors",
          checked ? "bg-go" : "bg-line",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full border-2 border-ink bg-white transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-ink-soft">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="text-sm font-semibold">{label ?? "Loading"}</span>
    </div>
  );
}

export function Stars({ rating, count }: { rating?: number; count?: number }) {
  if (!rating) return <span className="text-sm text-mute">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold">
      <Star className="h-4 w-4 fill-honey text-ink" aria-hidden />
      {rating.toFixed(1)}
      {count != null && <span className="font-medium text-mute">({count.toLocaleString()})</span>}
    </span>
  );
}

/** Round score dial, 0-100. Green 75+, honey 55+, gray below. */
export function ScoreDial({ score, label }: { score: number; label?: string }) {
  const tone = score >= 75 ? "bg-go text-white" : score >= 55 ? "bg-honey text-ink" : "bg-line text-ink-soft";
  return (
    <div className="flex flex-col items-center gap-0.5" title={label ?? "Match score"}>
      <div
        className={cx(
          "flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink font-display text-lg font-extrabold",
          tone,
        )}
      >
        {score}
      </div>
      {label && <span className="text-[10px] font-bold uppercase tracking-wide text-mute">{label}</span>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  /** @deprecated use icon */
  emoji?: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card flat className="border-dashed px-6 py-10 text-center">
      {icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-honey shadow-hard-sm">
          {icon}
        </div>
      )}
      <h3 className="mt-3 text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-ink-soft">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-xl border-2 border-stop bg-stop-soft px-4 py-3 text-sm font-semibold text-stop">
      {children}
    </div>
  );
}

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={cx("font-display font-extrabold tracking-tight", size === "lg" ? "text-3xl" : "text-2xl")}>
      <span className="rounded-lg border-2 border-ink bg-honey px-1.5 shadow-hard-sm">Hunny</span>
      <span className="ml-0.5">Do</span>
    </span>
  );
}
