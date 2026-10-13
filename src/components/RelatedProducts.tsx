import { getTranslations } from "next-intl/server";
import { getBrandNameMap } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import SectionHeader from "@/components/SectionHeader";
import type { ProductCard as ProductCardData } from "@/lib/api";

/**
 * "You may also like" -- backed by the real recommendations endpoint
 * (staff-curated; else what customers buy together with it, then the
 * category's in-stock best sellers -- see `RecommendationSelector.for_product`
 * and co_purchase.py). Uses the
 * `compact` card variant -- this is a secondary rail below the main
 * product, not the page's primary content. Renders nothing if there
 * simply are no other published products to recommend -- never a
 * fabricated "similar products" list.
 */
export default async function RelatedProducts({ products }: { products: ProductCardData[] }) {
  const t = await getTranslations("product");

  if (products.length === 0) return null;

  const brandNames = await getBrandNameMap();

  return (
    <section className="mt-12">
      <SectionHeader title={t("relatedProducts")} />
      <div className="mt-4">
        <ProductGrid dense>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} brandName={brandNames[product.brand_id ?? ""] ?? null} variant="compact" />
          ))}
        </ProductGrid>
      </div>
    </section>
  );
}
