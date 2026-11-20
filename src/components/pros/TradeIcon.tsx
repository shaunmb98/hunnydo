import { Bug, Droplets, Hammer, Home, Snowflake, Trees, WashingMachine, Zap, type LucideIcon } from "lucide-react";
import { cx } from "@/lib/format";
import type { TradeId } from "@/lib/types";

const ICONS: Record<TradeId, LucideIcon> = {
  plumbing: Droplets,
  electrical: Zap,
  hvac: Snowflake,
  roofing: Home,
  appliance: WashingMachine,
  handyman: Hammer,
  pest: Bug,
  landscaping: Trees,
};

/** Line icon for a trade. `tile` wraps it in a small honey square. */
export function TradeIcon({ id, className, tile }: { id: TradeId; className?: string; tile?: boolean }) {
  const Icon = ICONS[id] ?? Hammer;
  if (tile) {
    return (
      <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-honey", className)} aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
    );
  }
  return <Icon className={cx("inline-block h-4 w-4 shrink-0", className)} aria-hidden />;
}

/** Dashed empty-state card with an icon instead of a picture. */
export function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink bg-white px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-honey shadow-hard-sm" aria-hidden>
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-ink-soft">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
