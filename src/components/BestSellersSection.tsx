import { Flame } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBestSellers, getBrandNameMap } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import SectionHeader from "@/components/SectionHeader";

/**
 * Real, backend-driven Best Sellers section -- ranking derived from
 * confirmed order data (apps.ordering), never a fabricated "best
 * seller" flag or random product selection. Renders nothing until
 * the store has real, qualifying sales.
 */
export default async function BestSellersSection() {
  const t = await getTranslations("home.bestSellers");

  let products;
  let brandNames: Record<string, string> = {};
  try {
    const [result, brandMap] = await Promise.all([getBestSellers(4, await getLocale()), getBrandNameMap()]);
    products = result.data;
    brandNames = brandMap;
  } catch {
    return null;
  }

  if (products.length === 0) return null;

  return (
    <section className="mt-16">
      <SectionHeader
        icon={<Flame className="h-5 w-5 text-orange-500" strokeWidth={1.75} aria-hidden="true" />}
        title={t("title")}
        viewAllHref="/products"
        viewAllLabel={t("viewAll")}
      />
      <div className="mt-4">
        <ProductGrid>
          {products.map((product, idx) => (
            <ProductCard key={product.id} product={product} brandName={brandNames[product.brand_id ?? ""] ?? null} priority={idx < 4} />
          ))}
        </ProductGrid>
      </div>
    </section>
  );
}
