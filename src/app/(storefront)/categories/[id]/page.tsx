import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Package, SlidersHorizontal, X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBrandNameMap, getCategories, getProducts } from "@/lib/api";
import MediaImage from "@/components/MediaImage";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import { EmptyState, ErrorState } from "@/components/ui";
import { getBrand } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo";
import { localizedPath } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site-url";
import type { Locale } from "@/i18n/config";
import { breadcrumbJsonLd } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

/**
 * Same real-data-only pattern as the Brand Detail page (see its own
 * docstring): `GET /categories` has no `/categories/{id}` detail
 * route or product count of its own, so this resolves the category's
 * name/image from that same list, and its real product count from
 * the existing, already-accurate `GET /products?filter[category_id]=` pagination.
 */
async function resolveCategory(id: string) {
  const { data: categories } = await getCategories(await getLocale());
  return { category: categories.find((c) => c.id === id) ?? null, allCategories: categories };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [{ category }, t, { name: brand }] = await Promise.all([resolveCategory(id), getTranslations("seo"), getBrand()]);
  if (!category) return { title: (await getTranslations("meta"))("category") };
  return pageMetadata({ path: `/categories/${category.id}`, title: t("categoryTitle", { name: category.name }), description: t("categoryDescription", { name: category.name, brand }), image: category.image_url });
}

const PAGE_SIZE = 12;

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? "1") || 1;
  const t = await getTranslations("catalog");
  const tNav = await getTranslations("navigation");

  const { category, allCategories } = await resolveCategory(id);
  if (!category) notFound();

  let products: Awaited<ReturnType<typeof getProducts>>["data"] = [];
  let brandNames: Record<string, string> = {};
  let totalCount = 0;
  let totalPages = 1;
  let loadError = false;
  try {
    const [result, brandMap] = await Promise.all([getProducts({ categoryId: id, page, pageSize: PAGE_SIZE, locale: await getLocale() }), getBrandNameMap()]);
    products = result.data;
    brandNames = brandMap;
    totalCount = result.pagination?.total_count ?? 0;
    totalPages = result.pagination?.total_pages ?? 1;
  } catch {
    loadError = true;
  }

  const otherCategories = allCategories.filter((c) => c.id !== id).slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={[
        breadcrumbJsonLd([{ name: tNav("home"), path: "/" }, { name: t("title"), path: "/products" }, { name: category.name, path: `/categories/${category.id}` }], (await getLocale()) as Locale),
        { "@context": "https://schema.org", "@type": "CollectionPage", name: category.name, url: absoluteUrl(localizedPath(`/categories/${category.id}`, (await getLocale()) as Locale)), isPartOf: { "@id": absoluteUrl("/#website") } },
      ]} />
      <nav aria-label={t("breadcrumbLabel")} className="mb-6 flex items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/" className="transition-colors hover:text-primary">
          {tNav("home")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <Link href="/products" className="transition-colors hover:text-primary">
          {t("title")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="truncate font-medium text-ink">{category.name}</span>
      </nav>

      {/* Category hero -- name/image/count only, per this endpoint's real fields; no fabricated description. */}
      <div className="nz-glass-strong flex flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center sm:px-10">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
          <MediaImage src={category.image_url} alt="" fit="cover" fallbackIcon={<Package className="h-10 w-10 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{category.name}</h1>
          {!loadError && <p className="mt-1.5 text-sm text-ink-muted">{t("resultCount", { count: totalCount })}</p>}
        </div>
      </div>

      {/* Active-filter chip + escape hatch into the full Catalog filter sidebar (brand/price/availability combined with this same category) -- reuses the existing `/products?category=` capability rather than duplicating CatalogFilterPanel here. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href="/products" className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary transition-colors hover:brightness-95">
          {t("filterCategory")}: {category.name} <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
        </Link>
        <Link
          href={`/products?category=${id}`}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-primary"
        >
          <SlidersHorizontal className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
          {t("refineFilters")}
        </Link>
      </div>

      <div className="mt-6">
        {loadError && <ErrorState message={t("error")} />}

        {!loadError && products.length === 0 && (
          <EmptyState icon={<Package className="h-16 w-16" strokeWidth={1.25} aria-hidden="true" />} title={t("noProductsForCategory")} />
        )}

        {!loadError && products.length > 0 && (
          <>
            <ProductGrid>
              {products.map((product, idx) => (
                <ProductCard key={product.id} product={product} brandName={brandNames[product.brand_id ?? ""] ?? null} priority={idx < 4} />
              ))}
            </ProductGrid>

            {totalPages > 1 && (
              <nav aria-label={t("paginationLabel")} className="mt-10 flex flex-wrap items-center justify-center gap-2">
                {page > 1 && (
                  <Link href={`/categories/${id}?page=${page - 1}`} className="nz-glass rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:text-primary">
                    &larr;
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/categories/${id}?page=${p}`}
                    aria-current={p === page ? "page" : undefined}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5 ${p === page ? "nz-cta" : "nz-glass text-ink-muted hover:text-primary"}`}
                  >
                    {p}
                  </Link>
                ))}
                {page < totalPages && (
                  <Link href={`/categories/${id}?page=${page + 1}`} className="nz-glass rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:text-primary">
                    &rarr;
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>

      {otherCategories.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight text-ink">{t("otherCategories")}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {otherCategories.map((c) => (
              <Link key={c.id} href={`/categories/${c.id}`} className="nz-glass nz-glass-interactive group flex flex-col items-center justify-center gap-3 rounded-2xl p-5 text-center">
                <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-surface-2">
                  <MediaImage src={c.image_url} alt="" fit="cover" fallbackIcon={<Package className="h-5 w-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />} />
                </div>
                <span className="text-sm font-medium text-ink">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
