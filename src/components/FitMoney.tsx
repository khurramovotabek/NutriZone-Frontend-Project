"use client";

import { useLocale } from "next-intl";
import { formatMoney, formatMoneyCompact } from "@/lib/account-insights";

/** A money amount that always fits its tile: compact on phones ("34,3 mln UZS"), exact from `sm` up; the exact amount is the tooltip. */
export default function FitMoney({ amount, currency }: { amount: number; currency: string | null }) {
  const locale = useLocale();
  const full = formatMoney(amount, currency);
  return (
    <span title={full}>
      <span className="sm:hidden">{formatMoneyCompact(amount, currency, locale)}</span>
      <span className="hidden sm:inline">{full}</span>
    </span>
  );
}
