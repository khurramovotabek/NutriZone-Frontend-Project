import { getLocale, getTranslations } from "next-intl/server";
import { getBrandNameMap, getCategories, searchProducts, type Category, type ProductCard as ProductCardData } from "@/lib/api";
import { categoryPath } from "@/lib/entity-paths";
import Link from "next/link";
import FullBleedImage from "@/components/FullBleedImage";
import ProductCard from "@/components/ProductCard";
import SectionHeader from "@/components/SectionHeader";

/**
 * One home-page shelf for a catalogue category ("Proteinlar", "Kreatin", "Geynerlar", "Pre-Workout"...): its
 * best sellers that are in stock, one swipeable row on phones, a 5-up grid on desktop. `slug` is the category's
 * Uzbek slug (stable, set in the Dashboard); the shelf renders nothing when the category is missing or empty.
 */
export default async function CategoryRail({ slug, tKey }: { slug: string; tKey: string }) {
  const locale = await getLocale();
  const t = await getTranslations("home.categoryRails");
  let data: {
    category: Category;
    products: ProductCardData[];
    brandNames: Record<string, string>;
  } | null = null;
  try {
    const categories = await getCategories(locale).then((r) => r.data);
    const category = categories.find((c) => (c.slugs?.uz ?? c.slug) === slug || c.slug === slug);
    if (category) {
      const [result, brandNames] = await Promise.all([
        searchProducts({
          q: "",
          categoryId: category.id,
          inStock: true,
          sort: "-popularity",
          pageSize: 10,
          locale,
        }),
        getBrandNameMap(),
      ]);
      data = { category, products: result.data, brandNames };
    }
  } catch {
    return null;
  }
  if (!data || data.products.length < 2) return null;
  const { category, products, brandNames } = data;
  const href = categoryPath(category, locale);

  return (
    <section className="mt-14" aria-label={category.name}>
      <SectionHeader
        eyebrow={t(`${tKey}.eyebrow`)}
        icon={
          category.image_url ? (
            <span className="relative inline-flex h-8 w-8 shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-ink/10">
              <FullBleedImage src={category.image_url} alt="" sizes="32px" fallbackIcon={null} />
            </span>
          ) : undefined
        }
        title={t(`${tKey}.title`)}
        subtitle={t(`${tKey}.subtitle`)}
        viewAllHref={href}
        viewAllLabel={t("viewAll")}
      />
      <div className="nz-snap-row -mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        {products.map((product, idx) => (
          <div key={product.id} className={`w-[46%] shrink-0 snap-start sm:w-auto ${idx >= 6 ? "sm:hidden" : idx === 5 ? "lg:hidden" : ""}`}>
            <ProductCard product={product} brandName={brandNames[product.brand_id ?? ""] ?? null} />
          </div>
        ))}
        <Link
          href={href}
          className="nz-glass nz-glass-interactive flex w-[46%] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center text-sm font-bold text-primary sm:hidden"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl">→</span>
          {t("seeAllIn", { name: category.name })}
        </Link>
      </div>
    </section>
  );
}
