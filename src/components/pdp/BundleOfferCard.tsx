"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Package, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import ProductMediaImage from "@/components/ProductMediaImage";
import { formatPrice } from "@/components/PriceTag";
import { addAndPrice } from "@/lib/cart-client";
import { emitCartUpdated } from "@/lib/cart-events";
import type { BundleOffer } from "@/lib/pdp-api";

/**
 * "Birga arzonroq" -- this product + one companion (a staff pick, else what customers buy together), the companion
 * discounted. One button puts both in the cart; the cart / checkout apply the discount themselves for every pair
 * (backend products/infrastructure/bundles.py), so the price promised here is the price charged.
 */
export default function BundleOfferCard({ offer, main }: {
  offer: BundleOffer;
  main: { variantId: string | null; name: string; image: string | null; price: string | null; currency: string | null; outOfStock: boolean };
}) {
  const t = useTranslations("product");
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const currency = main.currency ?? "UZS";
  const mainPrice = Number(main.price ?? 0);
  const before = mainPrice + Number(offer.price);
  const after = mainPrice + Number(offer.bundle_price);
  const disabled = !main.variantId || !main.price || main.outOfStock || state === "busy";

  async function addBoth() {
    if (disabled || !main.variantId) return;
    setState("busy");
    const first = await addAndPrice(main.variantId, 1).catch(() => null);
    if (first && first.status === 401) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const second = first?.ok ? await addAndPrice(offer.variant_id, 1).catch(() => null) : null;
    emitCartUpdated();
    if (first?.ok && second?.ok) {
      setState("done");
      router.refresh();
    } else {
      setState("error");
    }
  }

  return (
    <section className="nz-liquid relative mt-4 overflow-hidden rounded-3xl p-4 sm:p-5" aria-labelledby="bundle-title">
      <span className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-emerald-400/20 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </span>
        <h2 id="bundle-title" className="text-[15px] font-bold text-ink">{t("bundleTitle")}</h2>
        <span className="ml-auto rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm shadow-emerald-500/30">−{offer.percent}%</span>
      </div>
      <p className="relative mt-1 text-xs text-ink-soft">{offer.source === "curated" ? t("bundleHintCurated") : t("bundleHintAuto")}</p>

      <div className="relative mt-4 flex items-center gap-2 sm:gap-3">
        <Tile image={main.image} name={main.name} price={formatPrice(main.price, currency)} caption={t("bundleThis")} />
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface/80 text-ink-muted shadow-sm ring-1 ring-border/70 backdrop-blur" aria-hidden="true">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <Tile
          image={offer.product.primary_image_path}
          name={offer.product.name}
          href={`/products/${offer.product.slug}?variant=${offer.variant_id}`}
          caption={offer.variant_label}
          price={formatPrice(offer.bundle_price, currency)}
          oldPrice={formatPrice(offer.price, currency)}
        />
      </div>

      <div className="relative mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border/60 pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{t("bundleTogether")}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold tabular-nums tracking-tight text-ink">{formatPrice(after, currency)}</span>
            <span className="text-sm tabular-nums text-ink-soft line-through">{formatPrice(before, currency)}</span>
          </p>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t("bundleSaving", { amount: formatPrice(offer.saving, currency) ?? "" })}</p>
        </div>
        <button
          type="button"
          onClick={addBoth}
          disabled={disabled}
          className="nz-cta inline-flex h-11 min-w-[11rem] flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
        >
          {state === "busy" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : state === "done" ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingBag className="h-4 w-4" aria-hidden="true" />}
          {state === "done" ? t("bundleAdded") : t("bundleAddBoth")}
        </button>
      </div>
      {state === "done" && (
        <p className="relative mt-2 text-xs text-ink-muted" role="status">
          {t("bundleAddedHint")} <Link href="/cart" className="font-semibold text-primary hover:underline">{t("bundleGoCart")}</Link>
        </p>
      )}
      {state === "error" && <p className="relative mt-2 text-xs text-red-600 dark:text-red-400" role="alert">{t("bundleError")}</p>}
    </section>
  );
}

function Tile({ image, name, caption, price, oldPrice, href }: { image: string | null; name: string; caption?: string; price: string | null; oldPrice?: string | null; href?: string }) {
  const body = (
    <>
      <span className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        <ProductMediaImage src={image} size="small" alt={name} padding="p-2" fallbackIcon={<Package className="h-6 w-6 text-ink-soft" aria-hidden="true" />} />
      </span>
      <span className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-ink group-hover:text-primary">{name}</span>
      {caption && <span className="mt-0.5 block truncate text-[11px] text-ink-soft">{caption}</span>}
      <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-sm font-bold tabular-nums text-ink">
        {price}
        {oldPrice && <span className="text-[11px] font-medium text-ink-soft line-through">{oldPrice}</span>}
      </span>
    </>
  );
  const cls = "group min-w-0 flex-1 rounded-2xl p-2 transition-colors";
  return href ? <Link href={href} className={`${cls} hover:bg-surface-2/60`}>{body}</Link> : <div className={cls}>{body}</div>;
}
