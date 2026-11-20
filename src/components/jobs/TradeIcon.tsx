import { Bug, Droplets, Hammer, Home, Snowflake, Trees, WashingMachine, Wrench, Zap, type LucideIcon } from "lucide-react";
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

/** Icon for a trade. Falls back to a wrench when the trade isn't known yet. */
export function TradeIcon({ trade, className }: { trade?: TradeId | string; className?: string }) {
  const Icon = (trade && ICONS[trade as TradeId]) || Wrench;
  return <Icon className={className ?? "h-5 w-5"} aria-hidden />;
}
