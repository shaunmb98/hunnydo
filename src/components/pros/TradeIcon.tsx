import { Bug, Droplets, Hammer, Home, Snowflake, Trees, WashingMachine, Zap, type LucideIcon } from "lucide-react";
import { cx } from "@/lib/format";
import type { TradeId } from "@/lib/types";

export { TradeIcon } from "@/components/TradeIcon";

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
    <div className="rounded-md border border-dashed border-line bg-white px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-line bg-honey" aria-hidden>
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-ink-soft">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
