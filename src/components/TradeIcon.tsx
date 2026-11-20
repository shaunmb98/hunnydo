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

/** Trade icon. `tile` draws it in a small honey square, the way trades show up across the app. */
export function TradeIcon({
  trade,
  tile,
  className,
}: {
  trade?: TradeId | string;
  tile?: boolean;
  className?: string;
}) {
  const Icon = ICONS[(trade as TradeId) ?? "handyman"] ?? Hammer;
  if (!tile) return <Icon className={cx("h-5 w-5", className)} aria-hidden />;
  return (
    <span
      className={cx(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-honey",
        className,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}
