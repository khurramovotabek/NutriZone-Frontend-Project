"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/components/PriceTag";

export interface DeliveryOptions {
  currency: string;
  zones: {
    tashkent: { pricing: "up_to"; fee: string; min_fee: string; carrier: string; eta: string };
    regions: { pricing: "from"; fee: string; base_kg: string; extra_per_kg: string; carrier: string; eta: string };
  };
  tashkent_region_ids: string[];
  free_from: string | null;
  pickup_fee: string;
}

let cached: Promise<DeliveryOptions | null> | null = null;

/** The dashboard's delivery prices, fetched once per page load. */
export function loadDeliveryOptions(): Promise<DeliveryOptions | null> {
  cached ??= fetch("/api/delivery/options")
    .then((res) => res.json())
    .then((body) => (body?.success ? (body.data as DeliveryOptions) : null))
    .catch(() => {
      cached = null;
      return null;
    });
  return cached;
}

/** "В течение 1 рабочего дня" → "в течение 1 рабочего дня" when it continues a sentence. */
export function lowerFirst(text: string): string {
  return text ? text.charAt(0).toLocaleLowerCase() + text.slice(1) : text;
}

/** "Delivery: Tashkent city up to 30 000 so'm, regions from 30 000 so'm. Pickup is free." (+ free threshold when set). */
export default function DeliveryRatesNote({ className = "", goodsTotal = null }: { className?: string; /** The cart's goods total: a "N left to free delivery" bar when the dashboard sets a free-delivery threshold. */ goodsTotal?: number | null }) {
  const t = useTranslations("cart");
  const tq = useTranslations("checkout.deliveryQuote");
  const [options, setOptions] = useState<DeliveryOptions | null>(null);

  useEffect(() => {
    let alive = true;
    void loadDeliveryOptions().then((o) => {
      if (alive) setOptions(o);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!options) return null;
  const cur = options.currency;
  return (
    <div className={`flex items-start gap-2 rounded-xl bg-surface-2/60 p-3 text-xs text-ink-muted ${className}`}>
      <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} aria-hidden="true" />
      <p>
        {options.zones.tashkent.eta && options.zones.regions.eta
          ? t("deliveryRatesEta", {
              tashkent: formatPrice(options.zones.tashkent.fee, cur) ?? "",
              regions: formatPrice(options.zones.regions.fee, cur) ?? "",
              tashkentEta: lowerFirst(options.zones.tashkent.eta),
              regionsEta: lowerFirst(options.zones.regions.eta),
            })
          : t("deliveryRates", { tashkent: formatPrice(options.zones.tashkent.fee, cur) ?? "", regions: formatPrice(options.zones.regions.fee, cur) ?? "" })}
        <Link href="/delivery" className="ml-1 font-semibold text-primary hover:underline">
          {t("deliveryMore")} →
        </Link>
        {options.free_from && goodsTotal === null && <span className="mt-0.5 block font-medium text-success">{tq("freeFrom", { amount: formatPrice(options.free_from, cur) ?? "" })}</span>}
        {options.free_from && goodsTotal !== null && <FreeDeliveryBar goods={goodsTotal} threshold={Number(options.free_from)} currency={cur} />}
      </p>
    </div>
  );
}

/** How far the cart is from free delivery (the backend makes delivery free from the same threshold, delivery_pricing.py). */
function FreeDeliveryBar({ goods, threshold, currency }: { goods: number; threshold: number; currency: string }) {
  const t = useTranslations("cart");
  if (!threshold) return null;
  const left = Math.max(0, threshold - goods);
  const pct = Math.min(100, Math.round((goods / threshold) * 100));
  return (
    <span className="mt-2 block">
      <span className={`block font-semibold ${left ? "text-ink" : "text-success"}`}>
        {left ? t("freeDeliveryLeft", { amount: formatPrice(left, currency) ?? "" }) : t("freeDeliveryReached")}
      </span>
      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
        <span className={`block h-full rounded-full transition-[width] duration-700 ${left ? "bg-gradient-to-r from-primary to-sky-400" : "bg-success"}`} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}
