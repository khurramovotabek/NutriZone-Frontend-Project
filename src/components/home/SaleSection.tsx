import { BadgePercent } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBrandNameMap, searchProducts } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import SectionHeader from "@/components/SectionHeader";

/**
 * "Aksiyalar" -- every product that is marked down right now (an old price above the current one), biggest discount
 * first. One swipeable row on phones, a grid on desktop. Renders nothing when nothing is on sale.
 */
export default async function SaleSection() {
  const t = await getTranslations("home.sale");
  let products: Awaited<ReturnType<typeof searchProducts>>["data"] = [];
  let brandNames: Record<string, string> = {};
  try {
    const [result, brands] = await Promise.all([searchProducts({ q: "", onSale: true, inStock: true, sort: "-discount", pageSize: 12, locale: await getLocale() }), getBrandNameMap()]);
    products = result.data;
    brandNames = brands;
  } catch {
    return null;
  }
  if (products.length === 0) return null;

  return (
    <section className="mt-14" aria-label={t("title")}>
      <SectionHeader
        eyebrow={t("eyebrow")}
        icon={<BadgePercent className="h-5 w-5 text-rose-500" strokeWidth={1.75} aria-hidden="true" />}
        title={t("title")}
        subtitle={t("subtitle", { count: products.length })}
        viewAllHref="/products?sale=1"
        viewAllLabel={t("viewAll")}
      />
      <div className="nz-snap-row -mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {products.map((product, idx) => (
          <div key={product.id} className="w-[46%] shrink-0 snap-start sm:w-auto">
            <ProductCard product={product} brandName={brandNames[product.brand_id ?? ""] ?? null} priority={idx < 2} />
          </div>
        ))}
      </div>
    </section>
  );
}
