"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import AddToCartButton from "@/components/AddToCartButton";
import ProductMediaImage from "@/components/ProductMediaImage";
import type { RunningLowItem } from "@/lib/orders-api";

const SHOWN = 3;

/**
 * "Tez orada tugaydi" -- what the shopper bought that is about to run out (their own buying rhythm or the servings
 * on the label), with a one-tap reorder. Renders nothing until there is something to show.
 */
export default function RunningLowCard() {
  const t = useTranslations("account.runningLow");
  const locale = useLocale();
  const [items, setItems] = useState<RunningLowItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/replenishment?locale=${encodeURIComponent(locale)}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setItems(body?.success ? (body.data as RunningLowItem[]) : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!items?.length) return null;

  return (
    <section className="nz-glass relative overflow-hidden rounded-3xl p-5" aria-labelledby="running-low-title">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
          <RefreshCw className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="running-low-title" className="font-semibold text-ink">{t("title")}</h2>
          <p className="text-xs text-ink-muted">{t("subtitle")}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-4">
        {items.slice(0, SHOWN).map((item) => {
          const used = Math.min(100, Math.max(4, Math.round((1 - item.days_left / Math.max(item.supply_days, 1)) * 100)));
          const urgent = item.days_left <= 5;
          const variantId = item.variant_id ?? item.product.default_variant_id;
          return (
            <li key={item.product.id} className="flex gap-3">
              <Link href={`/products/${item.product.slug}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white">
                <ProductMediaImage src={item.product.primary_image_path} size="small" alt={item.product.name} padding="p-1" sizes="56px" fallbackIcon={<Package className="h-5 w-5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${item.product.slug}`} className="line-clamp-1 text-sm font-semibold text-ink hover:text-primary">{item.product.name}</Link>
                <p className={`text-xs font-medium ${urgent ? "text-amber-600 dark:text-amber-400" : "text-ink-muted"}`}>
                  {item.days_left > 0 ? t("daysLeft", { count: item.days_left }) : t("maybeOut")}
                  <span className="text-ink-soft"> · {t(`basis.${item.basis}`)}</span>
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={100} aria-label={t("usedLabel")}>
                  <div className={`h-full rounded-full ${urgent ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${used}%` }} />
                </div>
                {variantId && <AddToCartButton variantId={variantId} className="mt-2 w-full" outOfStock={(item.product.stock_quantity ?? 1) <= 0} />}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
