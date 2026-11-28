"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Gift, LoaderCircle, Package, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import ProductMediaImage from "@/components/ProductMediaImage";
import { formatPrice } from "@/components/PriceTag";
import { addAndPrice } from "@/lib/cart-client";
import { emitCartUpdated } from "@/lib/cart-events";
import type { GiftCard } from "@/lib/pdp-api";

/**
 * Sovg'a aksiyasi on every protein / gainer page: the NutriZone shaker -- buy it now for its price, or get it free
 * with an order from the threshold (backend products/infrastructure/gift_offer.py adds it at checkout as a 0 so'm line).
 */
export default function GiftShakerCard({ gift, currency = "UZS" }: { gift: GiftCard; currency?: string | null }) {
  const t = useTranslations("gift");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const cur = currency ?? "UZS";

  async function add() {
    if (state === "busy") return;
    setState("busy");
    const r = await addAndPrice(gift.variant_id, 1).catch(() => null);
    emitCartUpdated();
    setState(r?.ok ? "done" : "error");
  }

  return (
    <section className="nz-liquid relative mt-4 overflow-hidden rounded-3xl p-4 sm:p-5" aria-labelledby="gift-shaker-title">
      <span className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-400/25 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Gift className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </span>
        <h2 id="gift-shaker-title" className="text-[15px] font-bold text-ink">{t("pdpTitle")}</h2>
      </div>

      <div className="relative mt-3 flex items-center gap-3 sm:gap-4">
        <Link href={`/products/${gift.slug}`} className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 sm:h-28 sm:w-28">
          <ProductMediaImage src={gift.image_path} size="small" alt={gift.name} padding="p-2" fallbackIcon={<Package className="h-6 w-6 text-ink-soft" aria-hidden="true" />} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/products/${gift.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug text-ink hover:text-primary">{gift.name}</Link>
          <p className="mt-0.5 text-xs text-ink-soft">{t("pdpWhy")}</p>
          {gift.value && <p className="mt-1 text-base font-extrabold tabular-nums text-ink">{formatPrice(gift.value, cur)}</p>}
        </div>
      </div>

      {gift.threshold && (
        <p className="relative mt-3 flex items-start gap-2 rounded-2xl bg-amber-500/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
          <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
          <span>{t.rich("pdpFree", { amount: formatPrice(gift.threshold, cur) ?? "", b: (c) => <b className="font-extrabold">{c}</b> })}</span>
        </p>
      )}

      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={add}
          disabled={state === "busy"}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-60 sm:flex-none"
        >
          {state === "busy" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : state === "done" ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingBag className="h-4 w-4" aria-hidden="true" />}
          {state === "done" ? t("added") : t("addShaker")}
        </button>
        {state === "done" && <Link href="/cart" className="text-xs font-semibold text-primary hover:underline">{t("goCart")}</Link>}
        {state === "error" && <p className="text-xs text-red-600 dark:text-red-400" role="alert">{t("addError")}</p>}
      </div>
    </section>
  );
}
