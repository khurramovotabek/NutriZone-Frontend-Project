"use client";

import { useEffect, useState } from "react";
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

/** "Delivery: Tashkent city up to 30 000 so'm, regions from 30 000 so'm. Pickup is free." (+ free threshold when set). */
export default function DeliveryRatesNote({ className = "" }: { className?: string }) {
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
        {t("deliveryRates", { tashkent: formatPrice(options.zones.tashkent.fee, cur) ?? "", regions: formatPrice(options.zones.regions.fee, cur) ?? "" })}
        {options.free_from && <span className="mt-0.5 block font-medium text-success">{tq("freeFrom", { amount: formatPrice(options.free_from, cur) ?? "" })}</span>}
      </p>
    </div>
  );
}
