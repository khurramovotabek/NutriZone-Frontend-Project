import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { PackageX, Percent, SearchX, X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBrands, getCategories, searchProducts } from "@/lib/api";
import { GOAL_CODES, catalogHref, parseCatalogParams, toggle } from "@/lib/catalog-params";
import { formatSizeKey } from "@/lib/format-weight";
import CatalogSortSelect from "@/components/CatalogSortSelect";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import CatalogFilterPanel from "@/components/CatalogFilterPanel";
import CatalogViewToggle from "@/components/CatalogViewToggle";
import ScrollSideNav from "@/components/ScrollSideNav";
import { EmptyState, ErrorState } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const [t, { q }] = await Promise.all([getTranslations("meta"), searchParams]);
  const query = q?.trim();
  if (query) return { title: t("search", { q: query.slice(0, 60) }), robots: { index: false, follow: true } };
  const tSeo = await getTranslations("seo");
  return pageMetadata({ path: "/products", title: tSeo("catalogTitle"), description: tSeo("catalogDescription") });
}
export const revalidate = 60;

function buildPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const state = parseCatalogParams(await searchParams);
  const { q, page } = state;
  const view = state.view === "list" ? "list" : "grid";
  const t = await getTranslations("catalog");
  const tGoals = await getTranslations("home.goals");
  const locale = await getLocale();

  let data: Awaited<ReturnType<typeof searchProducts>> | null = null;
  let loadError = false;
  let categories: Awaited<ReturnType<typeof getCategories>>["data"] = [];
  let brands: Awaited<ReturnType<typeof getBrands>>["data"] = [];

  try {
    // One endpoint for browsing and searching alike: smart search (when
    // there's a query), every filter, facets with counts, and sorting are
    // all resolved by the backend's catalog browse (GET /products/search).
    [data, { data: categories }, { data: brands }] = await Promise.all([
      searchProducts({
        q,
        page,
        pageSize: 24,
        record: Boolean(q) && page === 1,
        categoryId: state.category,
        brandIds: state.brands,
        flavourIds: state.flavours,
        sizes: state.sizes,
        goals: state.goals,
        priceMin: state.min,
        priceMax: state.max,
        ratingMin: state.rating,
        inStock: state.stock,
        onSale: state.sale,
        sort: state.sort,
        locale,
      }),
      getCategories(locale),
      getBrands(),
    ]);
  } catch {
    loadError = true;
  }

  const facets = data?.meta.facets;
  const activeCategoryName = state.category ? (facets?.category?.find((c) => c.id === state.category)?.name ?? categories.find((c) => c.id === state.category)?.name ?? null) : null;
  const brandName = (id: string) => facets?.brand?.find((b) => b.id === id)?.name ?? brands.find((b) => b.id === id)?.name ?? id.slice(0, 8);
  const flavourName = (id: string) => facets?.flavour?.find((f) => f.id === id)?.name ?? id.slice(0, 8);
  const fmt = (v: string) => Number(v).toLocaleString("ru-RU").replace(/\u00a0/g, " ");

  // Every active filter as a removable chip -- each links to the same view without that one filter.
  const chips: { key: string; label: string; href: string }[] = [
    ...(q ? [{ key: "q", label: `${t("clearSearch")}: "${q}"`, href: catalogHref(state, { q: undefined, sort: state.sort === "relevance" ? undefined : state.sort }) }] : []),
    ...(activeCategoryName ? [{ key: "category", label: `${t("filterCategory")}: ${activeCategoryName}`, href: catalogHref(state, { category: undefined }) }] : []),
    ...state.brands.map((id) => ({ key: `b-${id}`, label: brandName(id), href: catalogHref(state, { brands: state.brands.filter((b) => b !== id) }) })),
    ...(state.min || state.max
      ? [{ key: "price", label: `${t("filterPrice")}: ${state.min ? fmt(state.min) : "0"} – ${state.max ? fmt(state.max) : "∞"}`, href: catalogHref(state, { min: undefined, max: undefined }) }]
      : []),
    ...(state.rating ? [{ key: "rating", label: `★ ${t("ratingAndUp", { stars: state.rating })}`, href: catalogHref(state, { rating: undefined }) }] : []),
    ...state.flavours.map((id) => ({ key: `f-${id}`, label: flavourName(id), href: catalogHref(state, { flavours: state.flavours.filter((f) => f !== id) }) })),
    ...state.sizes.map((size) => ({ key: `s-${size}`, label: formatSizeKey(size), href: catalogHref(state, { sizes: state.sizes.filter((s) => s !== size) }) })),
    ...state.goals.map((g) => ({ key: `g-${g}`, label: `${tGoals("chip")}: ${tGoals(`${g}.title`)}`, href: catalogHref(state, { goals: state.goals.filter((x) => x !== g) }) })),
    ...(state.stock ? [{ key: "stock", label: t("inStockOnly"), href: catalogHref(state, { stock: false }) }] : []),
    ...(state.sale ? [{ key: "sale", label: t("onSaleOnly"), href: catalogHref(state, { sale: false }) }] : []),
  ];
  const viewBaseQuery = catalogHref(state, { view: undefined, page: state.page }).split("?")[1] ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <ScrollSideNav />
      <div className="flex flex-col gap-8 lg:flex-row">
        <Suspense fallback={null}>
          <CatalogFilterPanel state={state} facets={facets} categories={categories} />
        </Suspense>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {q ? t("searchResultsFor", { query: q }) : (activeCategoryName ?? t("title"))}
              </h1>
              {!loadError && data && data.pagination && data.pagination.total_count > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-ink-muted">{t("resultCount", { count: data.pagination.total_count })}</p>
                  {!state.sale && (facets?.on_sale_count ?? 0) > 0 && (
                    <Link
                      href={catalogHref(state, { sale: true, sort: state.sort ?? "-discount" })}
                      scroll={false}
                      className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/12 px-2.5 py-0.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-600 hover:text-white dark:text-rose-400"
                    >
                      <Percent className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                      {t("onSaleCount", { count: facets!.on_sale_count! })}
                    </Link>
                  )}
                </div>
              )}
              {q && !loadError && data?.meta.suggestion && data.meta.suggestion !== q.toLowerCase() && (
                <p className="mt-1.5 text-sm text-ink-muted">
                  {t("didYouMean")}{" "}
                  <Link href={catalogHref(state, { q: data.meta.suggestion })} className="font-semibold text-primary hover:underline">
                    {data.meta.suggestion}
                  </Link>
                </p>
              )}
            </div>
            {!loadError && data && (
              <div className="flex items-center gap-3">
                <CatalogSortSelect state={state} />
                {data.data.length > 0 && <CatalogViewToggle view={view} baseQuery={viewBaseQuery} />}
              </div>
            )}
          </div>

          {/* Shop by goal: one tap narrows the catalogue to what serves that goal (only goals that have products). */}
          {(facets?.goal?.length ?? 0) > 0 && (
            <nav aria-label={tGoals("chip")} className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
              {GOAL_CODES.filter((g) => state.goals.includes(g) || facets?.goal?.some((x) => x.id === g)).map((g) => {
                const on = state.goals.includes(g);
                const n = facets?.goal?.find((x) => x.id === g)?.count ?? 0;
                return (
                  <Link
                    key={g}
                    href={catalogHref(state, { goals: toggle(state.goals, g) })}
                    scroll={false}
                    aria-pressed={on}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${on ? "border-primary bg-primary text-primary-contrast shadow-md shadow-primary/25" : "border-border bg-surface/60 text-ink-muted hover:border-primary/50 hover:text-ink"}`}
                  >
                    <span aria-hidden="true">{tGoals(`${g}.emoji`)}</span>
                    {tGoals(`${g}.title`)}
                    <span className={`rounded-full px-1.5 text-[10px] ${on ? "bg-white/25" : "bg-surface-2"}`}>{n}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Active filter chips -- exactly what's applied, each removable on its own. */}
          {chips.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2" aria-label={t("activeFilters")}>
              {chips.map((chip) => (
                <Link
                  key={chip.key}
                  href={chip.href}
                  scroll={false}
                  aria-label={t("removeFilter", { label: chip.label })}
                  className="group flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary transition-colors hover:border-primary/60"
                >
                  {chip.label}
                  <X className="h-3 w-3 opacity-70 transition-opacity group-hover:opacity-100" strokeWidth={2.5} aria-hidden="true" />
                </Link>
              ))}
              {chips.length > 1 && (
                <Link href={q ? catalogHref({ ...state, category: undefined, brands: [], flavours: [], sizes: [], goals: [], min: undefined, max: undefined, rating: undefined, stock: false, sale: false }) : "/products"} scroll={false} className="px-1 text-xs font-medium text-ink-muted hover:text-primary hover:underline">
                  {t("clearAll")}
                </Link>
              )}
            </div>
          )}

          {loadError && <ErrorState message={t("error")} />}

          {!loadError && data && data.data.length === 0 && (
            <EmptyState
              icon={q ? <SearchX className="h-16 w-16" strokeWidth={1.25} aria-hidden="true" /> : <PackageX className="h-16 w-16" strokeWidth={1.25} aria-hidden="true" />}
              title={t("empty")}
              action={
                chips.length > 0 ? (
                  <Link href="/products" className="text-sm font-medium text-primary hover:underline">
                    {t("clearAll")}
                  </Link>
                ) : undefined
              }
            />
          )}

          {!loadError && data && data.data.length > 0 && (
            <>
              {view === "grid" ? (
                <ProductGrid>
                  {data.data.map((product, idx) => (
                    <ProductCard key={product.id} product={product} brandName={product.brand_id ? brandName(product.brand_id) : null} priority={idx < 4} />
                  ))}
                </ProductGrid>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.data.map((product) => (
                    <ProductCard key={product.id} product={product} brandName={product.brand_id ? brandName(product.brand_id) : null} layout="list" />
                  ))}
                </div>
              )}

              {data.pagination && data.pagination.total_pages > 1 && (
                <nav aria-label={t("paginationLabel")} className="mt-10 flex flex-wrap items-center justify-center gap-2">
                  {page > 1 && (
                    <Link href={catalogHref(state, { page: page - 1 })} className="nz-glass rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:text-primary">
                      &larr;
                    </Link>
                  )}
                  {buildPageNumbers(page, data.pagination.total_pages).map((p, idx) =>
                    p === "ellipsis" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-sm text-ink-soft">
                        &hellip;
                      </span>
                    ) : (
                      <Link
                        key={p}
                        href={catalogHref(state, { page: p })}
                        aria-current={p === page ? "page" : undefined}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5 ${p === page ? "nz-cta" : "nz-glass text-ink-muted hover:text-primary"}`}
                      >
                        {p}
                      </Link>
                    ),
                  )}
                  {page < data.pagination.total_pages && (
                    <Link href={catalogHref(state, { page: page + 1 })} className="nz-glass rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:text-primary">
                      &rarr;
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
