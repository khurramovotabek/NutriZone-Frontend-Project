"use client";

import { Gift, PartyPopper } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import ProductMediaImage from "@/components/ProductMediaImage";
import { formatPrice } from "@/components/PriceTag";
import type { GiftStatus } from "@/lib/pdp-api";

/**
 * Cart / checkout: "🎁 NutriZone shaker — sovg'a!" when the order earns it, else a progress bar to the threshold.
 * Shown only when the cart holds a protein / gainer (the server decides: backend gift_offer.status()).
 */
export default function GiftProgress({ status, currency = "UZS", className = "" }: { status: GiftStatus | null | undefined; currency?: string | null; className?: string }) {
  const t = useTranslations("gift");
  const locale = useLocale();
  if (!status || !status.items_qualify) return null;
  const cur = currency ?? "UZS";
  const name = status.gift.names?.[locale] || status.gift.name;
  const threshold = Number(status.threshold) || 1;
  const missing = Number(status.missing) || 0;
  const pct = Math.max(4, Math.min(100, Math.round(((threshold - missing) / threshold) * 100)));

  return (
    <div className={`rounded-2xl border p-3 ${status.earned ? "border-amber-400/50 bg-amber-500/10" : "border-border bg-surface-2/60"} ${className}`} role="status">
      <div className="flex items-center gap-3">
        <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
          <ProductMediaImage src={status.gift.image_path} size="small" alt={name} padding="p-1" fallbackIcon={<Gift className="h-5 w-5 text-amber-500" aria-hidden="true" />} />
        </span>
        <div className="min-w-0 flex-1 text-xs leading-snug">
          {status.earned ? (
            <>
              <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-300">
                <PartyPopper className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> {t("earnedTitle")}
              </p>
              <p className="mt-0.5 text-ink-muted">{t("earnedText", { name })}</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-ink">{t.rich("missingText", { amount: formatPrice(status.missing, cur) ?? "", name, b: (c) => <b className="font-extrabold text-amber-700 dark:text-amber-300">{c}</b> })}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/70" aria-hidden="true">
                <i className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}
        </div>
        {status.earned && <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">0 {cur === "UZS" ? t("som") : cur}</span>}
      </div>
    </div>
  );
}
