import { BadgePercent } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBrandNameMap, searchProducts } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import SectionHeader from "@/components/SectionHeader";

/**
 * "Aksiyalar" -- the 8 newest deals (products marked down most recently first, catalog sort "-sale_since"). One
 * swipeable row on phones, two full rows of four on desktop; the rest is one tap away under "Barcha chegirmalar".
 * Renders nothing when nothing is on sale.
 */
const SHOWN = 8;

export default async function SaleSection() {
  const t = await getTranslations("home.sale");
  let products: Awaited<ReturnType<typeof searchProducts>>["data"] = [];
  let brandNames: Record<string, string> = {};
  let total = 0;
  try {
    const locale = await getLocale();
    const deals = (sort: "-sale_since" | "-discount") => searchProducts({ q: "", onSale: true, inStock: true, sort, pageSize: SHOWN, locale });
    // an API without the "-sale_since" sort yet (frontend deployed first) answers 400 -- fall back to biggest discount
    const [result, brands] = await Promise.all([deals("-sale_since").catch(() => deals("-discount")), getBrandNameMap()]);
    products = result.data.slice(0, SHOWN);
    total = Math.max(result.pagination?.total_count ?? 0, products.length);
    brandNames = brands;
  } catch {
    return null;
  }
  if (products.length === 0) return null;

  return (
    <section className="mt-10 sm:mt-14" aria-label={t("title")}>
      <SectionHeader
        eyebrow={t("eyebrow")}
        icon={<BadgePercent className="h-5 w-5 text-rose-500" strokeWidth={1.75} aria-hidden="true" />}
        title={t("title")}
        subtitle={t("subtitle", { shown: products.length, count: total })}
        viewAllHref="/products?sale=1"
        viewAllLabel={t("viewAll")}
      />
      <div className="nz-snap-row -mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-4">
        {products.map((product, idx) => (
          <div key={product.id} className="w-[46%] shrink-0 snap-start sm:w-auto">
            <ProductCard product={product} brandName={brandNames[product.brand_id ?? ""] ?? null} priority={idx < 2} />
          </div>
        ))}
      </div>
    </section>
  );
}
