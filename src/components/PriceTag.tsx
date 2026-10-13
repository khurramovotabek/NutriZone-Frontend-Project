"use client";

import { useTranslations } from "next-intl";

/** "180,000 UZS" -- the site-wide price format (see ProductCard). */
export function formatPrice(price: string | number | null | undefined, currency: string | null | undefined): string | null {
  if (price === null || price === undefined || price === "" || !currency) return null;
  const amount = Math.round(Number(price));
  if (Number.isNaN(amount)) return null;
  return `${amount.toLocaleString("en-US")} ${currency}`;
}

/** True when there's a real markdown to show: an old price above the current one. */
export function isDiscounted(price: string | null | undefined, compareAt: string | null | undefined): boolean {
  return Boolean(price && compareAt && Number(compareAt) > Number(price));
}

const SIZES = {
  xs: { price: "text-sm", old: "text-[11px]", badge: "text-[10px] px-1.5 py-0.5", save: "text-[11px]" },
  sm: { price: "text-base", old: "text-xs", badge: "text-[11px] px-1.5 py-0.5", save: "text-xs" },
  md: { price: "text-lg", old: "text-sm", badge: "text-xs px-2 py-0.5", save: "text-xs" },
  xl: { price: "text-3xl sm:text-4xl", old: "text-base sm:text-lg", badge: "text-sm px-2.5 py-1", save: "text-sm" },
} as const;

/**
 * Current price, crossed-out old price and the discount, all from the API's
 * own `compare_at_price`/`discount_percent` (never computed client-side from
 * guesses). Without a real markdown it renders just the price.
 */
export default function PriceTag({
  price,
  compareAt,
  discountPercent,
  currency,
  size = "sm",
  showBadge = true,
  showSavings = false,
  className = "",
}: {
  price: string | null | undefined;
  compareAt?: string | null;
  discountPercent?: number | null;
  currency: string | null | undefined;
  size?: keyof typeof SIZES;
  showBadge?: boolean;
  showSavings?: boolean;
  className?: string;
}) {
  const t = useTranslations("product");
  const current = formatPrice(price ?? null, currency ?? null);
  if (!current) return null;
  const s = SIZES[size];
  const discounted = isDiscounted(price, compareAt);
  const old = discounted ? formatPrice(compareAt ?? null, currency ?? null) : null;
  const savings = discounted ? formatPrice(Number(compareAt) - Number(price), currency ?? null) : null;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={`font-extrabold tabular-nums tracking-tight ${discounted ? "text-rose-600 dark:text-rose-400" : "text-primary"} ${s.price}`}>
          <span className="sr-only">{t("currentPrice")}: </span>
          {current}
        </span>
        {old && (
          <span className={`tabular-nums text-ink-soft line-through decoration-ink-soft/70 ${s.old}`}>
            <span className="sr-only">{t("oldPrice")}: </span>
            {old}
          </span>
        )}
        {discounted && showBadge && discountPercent ? (
          <span className={`self-center rounded-md bg-rose-600 font-bold text-white ${s.badge}`}>{t("discountOff", { percent: discountPercent })}</span>
        ) : null}
      </div>
      {showSavings && savings && (
        <p className={`mt-1 font-semibold text-success ${s.save}`}>{t("youSave", { amount: savings })}</p>
      )}
    </div>
  );
}
