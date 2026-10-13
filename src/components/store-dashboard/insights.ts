import { WEEKDAYS, type MyStore } from "./types";

/**
 * Every number here is computed directly from real fields already
 * returned by GET /api/my-store -- nothing is fetched separately or
 * invented. The backend has no per-store sales/revenue analytics
 * endpoint yet (Order/OrderLineItem carry no store reference at all,
 * confirmed by inspecting apps/ordering -- see the dashboard-redesign
 * project note), so this dashboard deliberately charts store-profile
 * and inventory health instead of fabricating sales figures that
 * don't exist in the data model.
 */

export interface CompletenessResult {
  percent: number;
  filled: number;
  total: number;
  missingKeys: string[];
}

export function computeCompleteness(store: MyStore): CompletenessResult {
  const checks: Array<[string, boolean]> = [
    ["logo", !!store.logo_url],
    ["cover", !!store.cover_image_url],
    ["description", store.description.trim().length > 0],
    ["phone", store.phone_numbers.length > 0],
    ["email", store.email.trim().length > 0],
    ["telegram", store.telegram_username.trim().length > 0],
    ["address", store.address.trim().length > 0],
    ["city", store.city.trim().length > 0],
    ["coordinates", store.latitude != null && store.longitude != null],
    ["hours", Object.values(store.working_hours ?? {}).some((d) => !d.closed)],
    ["gallery", store.media.length > 0],
    ["products", store.products.length > 0],
  ];
  const filled = checks.filter(([, ok]) => ok).length;
  const total = checks.length;
  return { percent: total > 0 ? Math.round((filled / total) * 100) : 0, filled, total, missingKeys: checks.filter(([, ok]) => !ok).map(([k]) => k) };
}

export interface StockBreakdown {
  outOfStock: number;
  low: number;
  healthy: number;
  total: number;
}

const LOW_STOCK_THRESHOLD = 5;

export function computeStockBreakdown(store: MyStore): StockBreakdown {
  let outOfStock = 0;
  let low = 0;
  let healthy = 0;
  for (const p of store.products) {
    if (p.quantity <= 0) outOfStock += 1;
    else if (p.quantity <= LOW_STOCK_THRESHOLD) low += 1;
    else healthy += 1;
  }
  return { outOfStock, low, healthy, total: store.products.length };
}

export interface DayHours {
  code: string;
  hours: number;
  closed: boolean;
}

function parseTimeToHours(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  if (!match) return null;
  return Number(match[1]) + Number(match[2]) / 60;
}

export function computeWeeklyHours(store: MyStore): DayHours[] {
  return WEEKDAYS.map((code) => {
    const day = store.working_hours?.[code];
    if (!day || day.closed) return { code, hours: 0, closed: true };
    const open = parseTimeToHours(day.open);
    const close = parseTimeToHours(day.close);
    if (open == null || close == null) return { code, hours: 0, closed: true };
    const span = close - open;
    return { code, hours: span > 0 ? span : 0, closed: false };
  });
}

export function countOpenDays(store: MyStore): number {
  return computeWeeklyHours(store).filter((d) => !d.closed).length;
}
