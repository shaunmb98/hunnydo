import {
  BrickWall,
  Bug,
  Cylinder,
  DoorOpen,
  Droplets,
  Fence,
  Flame,
  Grid2x2,
  Hammer,
  HardHat,
  Home,
  KeyRound,
  Layers,
  PaintRoller,
  Shrub,
  Snowflake,
  Sofa,
  SprayCan,
  Sun,
  Trash2,
  TreeDeciduous,
  Umbrella,
  WashingMachine,
  Waves,
  Wind,
  Zap,
  CloudRain,
  type LucideIcon,
} from "lucide-react";
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
  landscaping: Shrub,
  dryer_vent: Wind,
  garage_door: DoorOpen,
  pool: Waves,
  locksmith: KeyRound,
  painting: PaintRoller,
  flooring: Layers,
  windows: Grid2x2,
  cleaning: SprayCan,
  carpet: Sofa,
  chimney: Flame,
  gutters: CloudRain,
  tree: TreeDeciduous,
  fencing: Fence,
  concrete: BrickWall,
  water_damage: Umbrella,
  septic: Cylinder,
  solar: Sun,
  junk: Trash2,
  remodel: HardHat,
};

/** Trade icon. `tile` draws it in a small honey square, the way trades show up across the app. */
export function TradeIcon({
  trade,
  id,
  tile,
  className,
}: {
  trade?: TradeId | string;
  /** Alias for `trade`. */
  id?: TradeId | string;
  tile?: boolean;
  className?: string;
}) {
  const Icon = ICONS[((trade ?? id) as TradeId) ?? "handyman"] ?? Hammer;
  if (!tile) return <Icon className={cx("h-5 w-5", className)} aria-hidden />;
  // The "tile" is just the icon at a slightly larger size, in ink. No coloured square behind it.
  return <Icon className={cx("h-6 w-6 shrink-0 text-ink-soft", className)} aria-hidden />;

}
