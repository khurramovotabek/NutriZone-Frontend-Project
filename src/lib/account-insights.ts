import type { Order } from "@/lib/orders-api";

/**
 * Pure, client-side computations over the customer's own already-
 * fetched order list (GET /api/orders) -- no new backend endpoint,
 * nothing invented. Real money math only counts orders whose status
 * represents an actual placed/paid order (matches the "success" tone
 * bucket the account page already uses for status badges), so
 * cancelled/failed/draft orders never inflate a "total spent" figure.
 */

const COUNTED_STATUSES = new Set(["confirmed", "processing", "shipped", "delivered", "completed"]);

/** Orders still on their way to the customer (placed, not yet delivered or closed). */
export const ACTIVE_STATUSES = new Set(["pending_payment", "confirmed", "processing", "shipped"]);

export function ordersByStatus(orders: Order[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;
  return counts;
}

export function orderTotal(order: Order): number {
  return order.lines.reduce((sum, line) => sum + Number(line.line_total.amount || 0), 0);
}

function dominantCurrency(orders: Order[]): string | null {
  const counts: Record<string, number> = {};
  for (const o of orders) counts[o.currency] = (counts[o.currency] ?? 0) + 1;
  let best: string | null = null;
  let bestCount = 0;
  for (const [currency, count] of Object.entries(counts)) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}

export interface SpendSummary {
  totalSpent: number;
  averageOrderValue: number;
  currency: string | null;
  countedOrders: number;
}

export function computeSpendSummary(orders: Order[]): SpendSummary {
  const currency = dominantCurrency(orders);
  const counted = orders.filter((o) => COUNTED_STATUSES.has(o.status) && (currency == null || o.currency === currency));
  const totalSpent = counted.reduce((sum, o) => sum + orderTotal(o), 0);
  return { totalSpent, averageOrderValue: counted.length > 0 ? totalSpent / counted.length : 0, currency, countedOrders: counted.length };
}

export interface MonthlyPoint {
  monthLabel: string;
  total: number;
}

/**
 * Buckets counted orders into the last `months` calendar months
 * (oldest first) by `placed_at`, for a simple spend trend line.
 */
export function computeMonthlySpend(orders: Order[], months = 6): MonthlyPoint[] {
  const { currency } = computeSpendSummary(orders);
  const now = new Date();
  const buckets: MonthlyPoint[] = [];
  const keyToIndex = new Map<string, number>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    keyToIndex.set(key, buckets.length);
    buckets.push({ monthLabel: d.toLocaleDateString(undefined, { month: "short" }), total: 0 });
  }

  for (const o of orders) {
    if (!COUNTED_STATUSES.has(o.status) || !o.placed_at) continue;
    if (currency != null && o.currency !== currency) continue;
    const d = new Date(o.placed_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = keyToIndex.get(key);
    if (idx !== undefined) buckets[idx].total += orderTotal(o);
  }

  return buckets;
}

export function orderItemCount(order: Order): number {
  return order.lines.filter((l) => l.status === "active").reduce((sum, l) => sum + l.quantity, 0);
}

export function formatMoney(amount: number, currency: string | null): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString();
  return currency ? `${formatted} ${currency}` : formatted;
}

// Explicit units: browsers' ICU data disagree for Uzbek (Chrome prints "34.3M", Node "34,3 mln").
const COMPACT_UNITS: Record<string, { units: [number, string][]; comma: boolean; space: boolean }> = {
  uz: { units: [[1e9, "mlrd"], [1e6, "mln"], [1e3, "ming"]], comma: true, space: true },
  ru: { units: [[1e9, "млрд"], [1e6, "млн"], [1e3, "тыс."]], comma: true, space: true },
  en: { units: [[1e9, "B"], [1e6, "M"], [1e3, "K"]], comma: false, space: false },
};

/** Short form for tight tiles, in the shopper's language: "34,3 mln UZS" / "34,3 млн UZS" / "34.3M UZS". */
export function formatMoneyCompact(amount: number, currency: string | null, locale: string): string {
  const spec = COMPACT_UNITS[locale] ?? COMPACT_UNITS.en;
  const n = Math.round(amount);
  const unit = spec.units.find(([size]) => Math.abs(n) >= size);
  let short = unit ? `${Number((n / unit[0]).toFixed(1))}` : String(n);
  if (spec.comma) short = short.replace(".", ",");
  if (unit) short += `${spec.space ? " " : ""}${unit[1]}`;
  return currency ? `${short} ${currency}` : short;
}
