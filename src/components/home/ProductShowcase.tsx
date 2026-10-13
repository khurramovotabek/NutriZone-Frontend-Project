"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Coins, Flame, LayoutGrid, Sparkles, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductCard as ProductCardData } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

export interface ShowcaseTab {
  key: "bestSellers" | "featured";
  products: ProductCardData[];
}

const ICONS = { bestSellers: Flame, featured: Sparkles } as const;

/**
 * One product block with tabs (best sellers / recommended) instead of two half-empty rails. A short list is topped up
 * with a "whole catalogue" tile so a growing catalogue never leaves a hole in the grid.
 */
export default function ProductShowcase({ tabs, brandNames }: { tabs: ShowcaseTab[]; brandNames: Record<string, string> }) {
  const t = useTranslations("home.showcase");
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((x) => x.key === active) ?? tabs[0];
  if (!current) return null;
  const products = current.products.slice(0, 8);
  const fillers = products.length < 4 ? 1 : 0;
  // the catalogue tile takes every column the products leave free on the row, so the grid never has a hole
  const span = [
    "",
    "col-span-1 sm:col-span-2 lg:col-span-3",
    "col-span-2 sm:col-span-1 lg:col-span-2",
    "col-span-1 sm:col-span-3 lg:col-span-1",
  ][products.length] ?? "";
  const wide = products.length <= 2;

  return (
    <section id="featured-products" className="mt-16 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{t("eyebrow")}</p>
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("title")}</h2>
        </div>
        <div className="flex items-center gap-3">
          {tabs.length > 1 && (
            <div role="tablist" aria-label={t("title")} className="nz-liquid inline-flex rounded-2xl p-1">
              {tabs.map(({ key }) => {
                const Icon = ICONS[key];
                const on = key === current.key;
                return (
                  <button
                    key={key}
                    role="tab"
                    type="button"
                    aria-selected={on}
                    onClick={() => setActive(key)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${on ? "bg-primary text-primary-contrast shadow" : "text-ink-muted hover:text-ink"}`}
                  >
                    <Icon className={`h-4 w-4 ${on ? "" : key === "bestSellers" ? "text-orange-500" : "text-primary"}`} strokeWidth={2} aria-hidden="true" />
                    {t(`tabs.${key}`)}
                  </button>
                );
              })}
            </div>
          )}
          <Link href="/products" className="group hidden items-center gap-1 text-sm font-semibold text-primary sm:inline-flex">
            {t("viewAll")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div role="tabpanel" className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, idx) => (
          <ProductCard key={`${current.key}-${product.id}`} product={product} brandName={brandNames[product.brand_id ?? ""] ?? null} variant="featured" priority={idx < 4} />
        ))}
        {fillers > 0 && (
          <Link
            href="/products"
            className={`group relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-5 text-white shadow-xl shadow-primary/20 ${span} ${wide ? "sm:p-8 lg:justify-center lg:p-10" : ""}`}
          >
            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-6 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl" />
            <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur ${wide ? "lg:mb-6" : ""}`}>
              <LayoutGrid className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="relative">
              <span className={`block font-extrabold leading-tight ${wide ? "text-2xl lg:text-4xl" : "text-xl"}`}>{t("catalogTitle")}</span>
              <span className={`mt-1.5 block text-white/80 ${wide ? "max-w-md text-sm lg:text-base" : "text-sm"}`}>{t("catalogText")}</span>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-primary transition-transform group-hover:translate-x-0.5">
                {t("catalogCta")}
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
              </span>
            </span>
            {products.length === 1 && (
              <span aria-hidden="true" className="absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
                {([[BadgeCheck, t("perkOriginal")], [Truck, t("perkDelivery")], [Coins, t("perkCoins")]] as const).map(([Icon, label], i) => (
                  <span key={label} className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur-md transition-transform duration-300 group-hover:-translate-x-1" style={{ marginRight: `${i * 18}px` }}>
                    <Icon className="h-5 w-5 text-cyan-200" strokeWidth={2} />
                    {label}
                  </span>
                ))}
              </span>
            )}
          </Link>
        )}
      </div>
    </section>
  );
}
