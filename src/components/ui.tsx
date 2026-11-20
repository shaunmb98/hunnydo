"use client";
import { Loader2, Star } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/format";

// HunnyDo UI kit: honey for the thing you should press, ink for weight, soft shadows for depth.

type Variant = "primary" | "dark" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-bold transition-[background,box-shadow,border-color] duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 cursor-pointer select-none";
const btnVariant: Record<Variant, string> = {
  primary: "bg-honey text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)] hover:bg-honey-dark",
  dark: "bg-ink text-white hover:bg-[#2a2a33]",
  outline: "bg-white text-ink border border-line-strong hover:border-ink hover:bg-paper",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-white text-stop border border-stop/50 hover:bg-stop-soft",
};
const btnSize: Record<Size, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-4.5 py-2.5 text-[15px]",
  lg: "px-6 py-3.5 text-[17px]",
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
        "rounded-2xl border border-line",
        !/\bbg-/.test(className ?? "") && "bg-white",
        !flat && "shadow-card",
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
  neutral: "bg-ink/[0.06] text-ink-soft",
  honey: "bg-honey-soft text-ink",
  green: "bg-go-soft text-go",
  red: "bg-stop-soft text-stop",
  amber: "bg-warn-soft text-warn",
  blue: "bg-sky-soft text-sky",
  dark: "bg-ink text-white",
};

/** A small tag. */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold",
        toneCls[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const fieldCls =
  "w-full rounded-[10px] border border-line-strong bg-white px-3.5 py-2.5 text-[15px] placeholder:text-mute transition-[border-color,box-shadow] focus:border-ink focus:outline-none focus:ring-4 focus:ring-honey/50";

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
          "relative h-7 w-12 shrink-0 rounded-full border border-line transition-colors",
          checked ? "bg-go" : "bg-line",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full border border-line bg-white transition-all",
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

/** Match score, 0-100, in a ring: green 75+, honey 55+, gray below. */
export function ScoreDial({ score, label }: { score: number; label?: string }) {
  const ring = score >= 75 ? "border-go text-go" : score >= 55 ? "border-honey-dark text-ink" : "border-line-strong text-mute";
  return (
    <div className="flex shrink-0 flex-col items-center gap-1" title={label ?? "Match score"}>
      <div className={cx("flex h-12 w-12 items-center justify-center rounded-full border-[3px] bg-white font-display text-lg font-bold tabular-nums", ring)}>
        {score}
      </div>
      {label && <span className="text-[11px] font-semibold text-mute">{label.toLowerCase()}</span>}
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
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
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
  const big = size === "lg";
  return (
    <span className={cx("inline-flex items-center gap-2 font-display font-bold tracking-tight", big ? "text-[22px] sm:text-[26px]" : "text-[22px]")}>
      <span
        className={cx("grid place-items-center rounded-[9px] bg-ink font-display font-bold text-honey", big ? "h-9 w-9 text-xl" : "h-8 w-8 text-lg")}
        aria-hidden
      >
        H
      </span>
      HunnyDo
    </span>
  );
}
