"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import SectionHeader from "@/components/SectionHeader";
import type { ProductCard as ProductCardData } from "@/lib/api";
import { getBrandNameMapClient, getCartCrossSellClient } from "@/lib/catalog-client";

/** "Bular bilan ko'pincha olinadi" under a non-empty cart -- mined from real baskets (co_purchase.py); hidden when there's no signal. */
export default function CartCrossSell({ variantIds }: { variantIds: string[] }) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const key = [...variantIds].sort().join(",");
  const [result, setResult] = useState<{ key: string; products: ProductCardData[]; brands: Record<string, string> } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    Promise.all([getCartCrossSellClient(key.split(","), locale).then((r) => r.data), getBrandNameMapClient()])
      .then(([products, brands]) => {
        if (!cancelled) setResult({ key, products, brands });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, products: [], brands: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [key, locale]);

  const products = result?.key === key ? result.products.slice(0, 4) : [];
  if (!products.length) return null;

  return (
    <section className="mt-10" aria-label={t("crossSellTitle")}>
      <SectionHeader icon={<Sparkles className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />} title={t("crossSellTitle")} />
      <div className="mt-4">
        <ProductGrid dense>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} brandName={result?.brands[product.brand_id ?? ""] ?? null} variant="compact" />
          ))}
        </ProductGrid>
      </div>
    </section>
  );
}
