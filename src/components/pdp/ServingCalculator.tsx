"use client";

import { useState } from "react";
import { CalendarDays, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/components/PriceTag";

/** "Kuniga 2 porsiya → bu idish 37 kunga yetadi": how long the selected size lasts at the shopper's own daily dose. */
export default function ServingCalculator({ servings, price, currency }: { servings: number; price: string | null; currency: string | null }) {
  const t = useTranslations("product");
  const [perDay, setPerDay] = useState(1);
  const days = Math.floor(servings / perDay);
  const weeks = Math.round(days / 7);
  const perDayCost = price ? Math.round((Number(price) / servings) * perDay) : null;
  const pct = Math.min(100, Math.round((days / 90) * 100));

  return (
    <section className="nz-liquid rounded-3xl p-4 sm:p-5" aria-labelledby="serving-calc-title">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <CalendarDays className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </span>
        <h3 id="serving-calc-title" className="text-[15px] font-bold text-ink">{t("calcTitle")}</h3>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-ink-muted">{t("calcPerDay")}</span>
        <div className="flex items-center gap-1 rounded-2xl bg-surface-2/80 p-1 ring-1 ring-border/60">
          <button type="button" onClick={() => setPerDay((v) => Math.max(1, v - 1))} disabled={perDay <= 1} aria-label={t("calcLess")}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface disabled:opacity-40">
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <output aria-live="polite" className="w-10 text-center text-base font-bold tabular-nums text-ink">{perDay}</output>
          <button type="button" onClick={() => setPerDay((v) => Math.min(4, v + 1))} disabled={perDay >= 4} aria-label={t("calcMore")}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface disabled:opacity-40">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        {t.rich("calcResult", { days, b: (chunks) => <b className="text-2xl font-extrabold tabular-nums tracking-tight text-ink">{chunks}</b> })}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <span className="block h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-[width] duration-500" style={{ width: `${Math.max(6, pct)}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {t("calcFacts", { servings, weeks: Math.max(1, weeks) })}
        {perDayCost !== null && <> · {t("calcPerDayCost", { price: formatPrice(perDayCost, currency) ?? "" })}</>}
      </p>
    </section>
  );
}
