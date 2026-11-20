import { Layers, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getBrandNameMap } from "@/lib/api";
import ProductRail from "@/components/ProductRail";
import type { ProductCard as ProductCardData } from "@/lib/api";

/**
 * The product page's recommendation blocks, as premium liquid-glass rails:
 * 1. "Sizga tavsiya etamiz" -- the real recommendations endpoint (staff-curated; else what customers buy together
 *    with it, then the category's in-stock best sellers -- see `RecommendationSelector.for_product`, co_purchase.py).
 * 2. "<Brand>ning boshqa mahsulotlari" -- the same brand's other published products, minus this one and anything
 *    rail 1 already shows, with a link to the brand page.
 * Each rail renders nothing when it has no real products -- never a fabricated "similar products" list.
 */
export default async function RelatedProducts({
  products,
  brandProducts = [],
  currentId,
  brandName,
  brandHref,
}: {
  products: ProductCardData[];
  brandProducts?: ProductCardData[];
  currentId?: string;
  brandName?: string | null;
  brandHref?: string | null;
}) {
  const t = await getTranslations("product");

  const recommended = products.filter((p) => p.id !== currentId).slice(0, 12);
  const shown = new Set(recommended.map((p) => p.id));
  const sameBrand = brandProducts.filter((p) => p.id !== currentId && !shown.has(p.id)).slice(0, 12);
  if (recommended.length === 0 && sameBrand.length === 0) return null;

  const brandNames = await getBrandNameMap();
  const nav = { prevLabel: t("railPrev"), nextLabel: t("railNext") };

  return (
    <div className="mt-10 space-y-6 sm:mt-12">
      <ProductRail
        id="recommended"
        icon={<Sparkles className="h-5 w-5" strokeWidth={1.9} />}
        title={t("relatedProducts")}
        subtitle={t("relatedProductsHint")}
        products={recommended}
        brandNames={brandNames}
        {...nav}
      />
      {brandName && (
        <ProductRail
          id="same-brand"
          icon={<Layers className="h-5 w-5" strokeWidth={1.9} />}
          tone="emerald"
          title={t("sameBrandTitle", { brand: brandName })}
          subtitle={t("sameBrandHint")}
          products={sameBrand}
          brandNames={brandNames}
          viewAllHref={brandHref ?? undefined}
          viewAllLabel={brandHref ? t("sameBrandAll") : undefined}
          {...nav}
        />
      )}
    </div>
  );
}
