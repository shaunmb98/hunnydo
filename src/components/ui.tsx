"use client";
import { Loader2, Star } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/format";

// HunnyDo UI kit. Flat and plain: hairline rules, small corners, yellow for the one thing you should press.

type Variant = "primary" | "dark" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded font-semibold transition-colors duration-100 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 cursor-pointer select-none";
const btnVariant: Record<Variant, string> = {
  primary: "bg-honey text-ink hover:bg-honey-dark",
  dark: "bg-ink text-white hover:bg-ink-soft",
  outline: "bg-white text-ink border border-line-strong hover:border-ink",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-white text-stop border border-stop/60 hover:bg-stop-soft",
};
const btnSize: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-[15px]",
  lg: "px-5 py-3 text-base",
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
  flat: _flat,
  ...rest
}: { className?: string; children: ReactNode; flat?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("rounded-md border border-line", !/\bbg-/.test(className ?? "") && "bg-white", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export type Tone = "neutral" | "honey" | "green" | "red" | "amber" | "blue" | "dark";
const toneCls: Record<Tone, string> = {
  neutral: "bg-ink/[0.06] text-ink-soft",
  honey: "bg-honey-soft text-ink",
  green: "bg-go-soft text-go",
  red: "bg-stop-soft text-stop",
  amber: "bg-warn-soft text-warn",
  blue: "bg-sky-soft text-sky",
  dark: "bg-ink text-white",
};

/** A small rectangular tag. */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-xs font-semibold",
        toneCls[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const fieldCls =
  "w-full rounded border border-line-strong bg-white px-3 py-2 text-[15px] placeholder:text-mute focus:border-ink focus:outline-none focus:ring-2 focus:ring-sky/40";

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
      className="flex w-full items-center justify-between gap-4 rounded-md border border-line bg-white px-4 py-3 text-left cursor-pointer"
    >
      <span>
        <span className="block text-[15px] font-bold">{label}</span>
        {description && <span className="block text-sm text-ink-soft">{description}</span>}
      </span>
      <span
        className={cx(
          "relative h-7 w-12 shrink-0 rounded border border-line transition-colors",
          checked ? "bg-go" : "bg-line",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded border border-line bg-white transition-all",
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

/** Match score, 0-100. A plain number: green 75+, ink 55+, gray below. */
export function ScoreDial({ score, label }: { score: number; label?: string }) {
  const tone = score >= 75 ? "text-go" : score >= 55 ? "text-ink" : "text-mute";
  return (
    <div className="flex w-12 shrink-0 flex-col items-center leading-none" title={label ?? "Match score"}>
      <span className={cx("font-display text-2xl font-bold tabular-nums", tone)}>{score}</span>
      <span className="mt-1 text-[11px] text-mute">{label ? label.toLowerCase() : "match"}</span>
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
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
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
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card flat className="border-dashed px-6 py-10 text-center">
      {icon && (
        <div className="mx-auto flex h-10 w-10 items-center justify-center text-ink-soft">
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
    <div role="alert" className="rounded-md border border-stop bg-stop-soft px-4 py-3 text-sm font-semibold text-stop">
      {children}
    </div>
  );
}

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-display font-extrabold", size === "lg" ? "text-2xl" : "text-xl")}>
      <span className={cx("bg-honey", size === "lg" ? "h-5 w-5" : "h-4 w-4")} aria-hidden />
      HunnyDo
    </span>
  );
}
