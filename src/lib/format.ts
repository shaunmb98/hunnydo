export const money = (n?: number) =>
  n == null ? "" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const moneyRange = (lo?: number, hi?: number) =>
  lo == null && hi == null ? "" : lo != null && hi != null && lo !== hi ? `${money(lo)} to ${money(hi)}` : money(lo ?? hi);

export function timeAgo(ts?: number) {
  if (!ts) return "";
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
