import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Package, SlidersHorizontal, X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBrandNameMap, getCategories, getCategoryDescription, getProducts } from "@/lib/api";
import MediaImage from "@/components/MediaImage";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import CatalogPagination from "@/components/CatalogPagination";
import { EmptyState, ErrorState } from "@/components/ui";
import { getBrand } from "@/lib/brand";
import { pageMetadata, samePrefixPath } from "@/lib/seo";
import { categoryPath, entityPaths, entitySlug, matchesParam } from "@/lib/entity-paths";
import { localizedPath } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site-url";
import type { Locale } from "@/i18n/config";
import { breadcrumbJsonLd, clip } from "@/lib/seo";
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
async function resolveCategory(param: string) {
  const { data: categories } = await getCategories(await getLocale());
  return { category: categories.find((c) => matchesParam(c, param)) ?? null, allCategories: categories };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: param } = await params;
  const locale = await getLocale();
  const [{ category }, t, { name: brand }] = await Promise.all([resolveCategory(param), getTranslations("seo"), getBrand()]);
  if (!category) return { title: (await getTranslations("meta"))("category") };
  const about = await getCategoryDescription(category.id, locale);
  const description = about ? clip(about.split(/\n\s*\n/)[0], 160) : t("categoryDescription", { name: category.name, brand });
  return pageMetadata({ path: entityPaths(categoryPath, category), title: t("categoryTitle", { name: category.name }), description, image: category.image_url });
}

const PAGE_SIZE = 12;

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const { id: param } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? "1") || 1;
  const t = await getTranslations("catalog");
  const tNav = await getTranslations("navigation");

  const { category, allCategories } = await resolveCategory(param);
  if (!category) notFound();
  // one address per category and language: the old /categories/<uuid> links and another language's slug move here for good
  if (decodeURIComponent(param) !== entitySlug(category)) permanentRedirect(await samePrefixPath(`${categoryPath(category)}${page > 1 ? `?page=${page}` : ""}`));
  const id = category.id;
  const about = await getCategoryDescription(id, await getLocale());
  const aboutParagraphs = about.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

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

  // The category's place in the tree: its ancestors (breadcrumb), its own sub-sections, and its siblings.
  const byId = new Map(allCategories.map((c) => [c.id, c]));
  const ancestors: typeof allCategories = [];
  for (let p = category.parent_id ? byId.get(category.parent_id) : undefined; p && ancestors.length < 5; p = p.parent_id ? byId.get(p.parent_id) : undefined) ancestors.unshift(p);
  const subCategories = allCategories.filter((c) => c.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);
  const otherCategories = allCategories.filter((c) => c.id !== id && c.parent_id === category.parent_id).sort((a, b) => a.sort_order - b.sort_order).slice(0, 12);
  const pageLocale = (await getLocale()) as Locale;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={[
        breadcrumbJsonLd([{ name: tNav("home"), path: "/" }, { name: t("title"), path: "/products" }, ...ancestors.map((a) => ({ name: a.name, path: categoryPath(a) })), { name: category.name, path: categoryPath(category) }], pageLocale),
        { "@context": "https://schema.org", "@type": "CollectionPage", name: category.name, url: absoluteUrl(localizedPath(categoryPath(category), pageLocale)), isPartOf: { "@id": absoluteUrl("/#website") } },
      ]} />
      <nav aria-label={t("breadcrumbLabel")} className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/" className="transition-colors hover:text-primary">
          {tNav("home")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <Link href="/products" className="transition-colors hover:text-primary">
          {t("title")}
        </Link>
        {ancestors.map((a) => (
          <span key={a.id} className="contents">
            <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <Link href={categoryPath(a)} className="truncate transition-colors hover:text-primary">{a.name}</Link>
          </span>
        ))}
        <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span className="truncate font-medium text-ink">{category.name}</span>
      </nav>

      {/* Category hero -- name, image, count and (when written in the dashboard) the category's own description. */}
      <div className="nz-glass-strong flex flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center sm:px-10">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
          <MediaImage src={category.image_url} alt="" fit="cover" fallbackIcon={<Package className="h-10 w-10 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{category.name}</h1>
          {!loadError && <p className="mt-1.5 text-sm text-ink-muted">{t("resultCount", { count: totalCount })}</p>}
        </div>
        {aboutParagraphs.length > 0 && (
          <details className="group w-full max-w-3xl text-left">
            <summary className="list-none [&::-webkit-details-marker]:hidden">
              <span className="sr-only">{t("aboutCategory", { name: category.name })}</span>
              <p className="text-sm leading-relaxed text-ink-muted sm:text-[15px]">{aboutParagraphs[0]}</p>
              {aboutParagraphs.length > 1 && (
                <span className="mt-2 inline-block cursor-pointer text-sm font-semibold text-primary hover:underline">
                  <span className="group-open:hidden">{t("readMore")}</span>
                  <span className="hidden group-open:inline">{t("showLess")}</span>
                </span>
              )}
            </summary>
            {aboutParagraphs.slice(1).map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-[15px]">
                {paragraph}
              </p>
            ))}
          </details>
        )}
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

      {subCategories.length > 0 && (
        <nav aria-label={category.name} className="mt-4 flex flex-wrap gap-2">
          {subCategories.map((c) => (
            <Link key={c.id} href={categoryPath(c)} className="nz-glass rounded-full px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary">
              {c.name}
            </Link>
          ))}
        </nav>
      )}

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

            <CatalogPagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              hrefFor={(p) => (p > 1 ? `${categoryPath(category)}?page=${p}` : categoryPath(category))}
              label={t("paginationLabel")}
            />
          </>
        )}
      </div>

      {otherCategories.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight text-ink">{t("otherCategories")}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {otherCategories.map((c) => (
              <Link key={c.id} href={categoryPath(c)} className="nz-glass nz-glass-interactive group flex flex-col items-center justify-center gap-3 rounded-2xl p-5 text-center">
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
