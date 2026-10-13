/** Shared number formatting for loyalty views: "1 250 000" (thin-space groups, like so'm prices across the site). */
export function formatSom(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Math.round(Number.isFinite(n) ? n : 0).toLocaleString("en-US").replace(/,/g, " ");
}

/** "3.00" -> "3", "2.50" -> "2.5" */
export function formatPercent(value: string | number): string {
  return String(Number(value));
}

/** Compact spend label for dense UI: 1 000 000 -> "1M", 2 500 000 -> "2.5M", 750 000 -> "750K". */
export function formatCompact(value: number | string): string {
  const n = Number(value);
  if (n >= 1_000_000) return `${Number((n / 1_000_000).toFixed(1))}M`;
  if (n >= 1_000) return `${Number((n / 1_000).toFixed(0))}K`;
  return String(n);
}

export function coinsFor(amount: number, percent: string | number): number {
  return Math.floor((amount * Number(percent)) / 100);
}
