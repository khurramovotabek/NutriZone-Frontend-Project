import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, BadgeCheck, ChevronRight, Package, Percent, Tag } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBrands, searchProducts, type CatalogSort } from "@/lib/api";
import BrandCard from "@/components/BrandCard";
import BrandGrid from "@/components/BrandGrid";
import BrandLogo from "@/components/BrandLogo";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import CatalogPagination from "@/components/CatalogPagination";
import { EmptyState, ErrorState } from "@/components/ui";
import { getBrand } from "@/lib/brand";
import { pageMetadata, samePrefixPath } from "@/lib/seo";
import { brandPath, entityPaths, entitySlug, matchesParam } from "@/lib/entity-paths";
import { localizedPath } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site-url";
import type { Locale } from "@/i18n/config";
import { breadcrumbJsonLd } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; sort?: string; sale?: string }>;
}

const PAGE_SIZE = 12;
const SORTS: CatalogSort[] = ["-created_at", "-popularity", "-discount", "price", "-price", "-rating"];

/** `GET /brands` (there is no per-brand endpoint) is the single source of a brand's name, logo, description and count. */
async function resolveBrand(param: string, locale?: string) {
  const { data: brands } = await getBrands(locale);
  return { brand: brands.find((b) => matchesParam(b, param)) ?? null, allBrands: brands };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [{ brand }, t, site] = await Promise.all([resolveBrand(id), getTranslations("seo"), getBrand()]);
  if (!brand) return { title: (await getTranslations("meta"))("brand") };
  return pageMetadata({ path: entityPaths(brandPath, brand), title: t("brandTitle", { name: brand.name }), description: brand.description?.trim() || t("brandDescription", { name: brand.name, brand: site.name }) });
}

export default async function BrandDetailPage({ params, searchParams }: Props) {
  const { id: param } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page ?? "1") || 1);
  const sort: CatalogSort = SORTS.includes(query.sort as CatalogSort) ? (query.sort as CatalogSort) : "-created_at";
  const onSale = query.sale === "1";
  const locale = await getLocale();
  const t = await getTranslations("catalog");
  const tBrands = await getTranslations("brands");
  const tNav = await getTranslations("navigation");

  const { brand, allBrands } = await resolveBrand(param, locale);
  if (!brand) notFound();
  const id = brand.id;
  const self = brandPath(brand, locale);
  const href = (changes: { page?: number; sort?: CatalogSort; sale?: boolean }) => {
    const p = new URLSearchParams();
    const nextSort = changes.sort ?? sort;
    const nextSale = changes.sale ?? onSale;
    if (nextSort !== "-created_at") p.set("sort", nextSort);
    if (nextSale) p.set("sale", "1");
    if ((changes.page ?? 1) > 1) p.set("page", String(changes.page));
    const qs = p.toString();
    return `${self}${qs ? `?${qs}` : ""}`;
  };
  // before any data loads, so it is a real 308 and not a redirect inside an already-streamed page
  // one address per brand and language: old /brands/<uuid> links and another language's slug move here for good
  if (decodeURIComponent(param) !== entitySlug(brand, locale)) permanentRedirect(await samePrefixPath(href({ page })));

  let products: Awaited<ReturnType<typeof searchProducts>>["data"] = [];
  let totalCount = 0;
  let totalPages = 1;
  let onSaleCount = 0;
  let loadError = false;
  try {
    const result = await searchProducts({ q: "", brandIds: [id], page, pageSize: PAGE_SIZE, sort, onSale, locale });
    products = result.data;
    totalCount = result.pagination?.total_count ?? 0;
    totalPages = result.pagination?.total_pages ?? 1;
    onSaleCount = result.meta.facets?.on_sale_count ?? 0;
  } catch {
    loadError = true;
  }

  const sortLabels: Record<string, string> = {
    "-created_at": t("sortNewest"),
    "-popularity": t("sortPopular"),
    "-discount": t("sortDiscount"),
    price: t("sortPriceAsc"),
    "-price": t("sortPriceDesc"),
    "-rating": t("sortRating"),
  };
  const otherBrands = allBrands.filter((b) => b.id !== id).slice(0, 4);
  const productCount = brand.product_count ?? totalCount;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={[
        breadcrumbJsonLd([{ name: tNav("home"), path: "/" }, { name: tBrands("title"), path: "/brands" }, { name: brand.name, path: self }], locale as Locale),
        { "@context": "https://schema.org", "@type": "CollectionPage", name: brand.name, url: absoluteUrl(localizedPath(self, locale as Locale)), about: { "@type": "Brand", name: brand.name }, isPartOf: { "@id": absoluteUrl("/#website") } },
      ]} />
      <nav aria-label={t("breadcrumbLabel")} className="mb-6 flex items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/" className="transition-colors hover:text-primary">
          {tNav("home")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <Link href="/brands" className="transition-colors hover:text-primary">
          {tBrands("title")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="truncate font-medium text-ink">{brand.name}</span>
      </nav>

      {/* Hero */}
      <section className="nz-glass nz-rise relative overflow-hidden rounded-3xl">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_0%_0%,rgba(var(--nz-primary-rgb),0.2),transparent_60%)]" />
          <div className="nz-orb -right-20 -top-24 h-72 w-72 bg-[rgba(var(--nz-primary-rgb),0.18)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--nz-primary-rgb),0.5)] to-transparent" />
        </div>
        <div className="relative flex flex-col gap-6 p-6 sm:p-10 md:flex-row md:items-center">
          <div className="h-36 w-full shrink-0 overflow-hidden rounded-3xl border border-border/60 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.6)] sm:h-40 md:w-60">
            <BrandLogo name={brand.name} logoUrl={brand.logo_url} padding="p-6" textSize="text-5xl" sizes="240px" loading="eager" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {tBrands("officialBadge")}
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{brand.name}</h1>
            {brand.country && (
              <p className="mt-1 text-sm font-medium text-ink-muted">
                <span aria-hidden="true">{brand.country.flag}</span> {brand.country.name}
              </p>
            )}
            {brand.description && (
              <details className="group mt-3 max-w-3xl">
                <summary className="list-none text-sm leading-relaxed text-ink-muted [&::-webkit-details-marker]:hidden">
                  <span className="line-clamp-3 whitespace-pre-line group-open:line-clamp-none">{brand.description}</span>
                  <span className="mt-1 inline-block cursor-pointer text-sm font-semibold text-primary hover:underline">
                    <span className="group-open:hidden">{tBrands("readMore")}</span>
                    <span className="hidden group-open:inline">{tBrands("showLess")}</span>
                  </span>
                </summary>
              </details>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-surface/55 px-3 py-2 text-sm font-semibold text-ink backdrop-blur-sm">
                <Package className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden="true" />
                {tBrands("productCount", { count: productCount })}
              </span>
              {onSaleCount > 0 && (
                <Link href={href({ sale: true, sort: "-discount" })} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600/12 px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-600 hover:text-white dark:text-rose-400">
                  <Percent className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                  {t("onSaleCount", { count: onSaleCount })}
                </Link>
              )}
              <Link href={`/products?brand=${id}`} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft">
                {tBrands("viewInCatalog")}
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar: all / on sale, and sort */}
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="nz-glass flex w-fit gap-1 rounded-2xl p-1">
          <Link href={href({ sale: false })} aria-current={!onSale ? "page" : undefined} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${!onSale ? "bg-primary text-white" : "text-ink-muted hover:text-ink"}`}>
            {tBrands("allProducts")}
          </Link>
          <Link href={href({ sale: true })} aria-current={onSale ? "page" : undefined} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${onSale ? "bg-rose-600 text-white" : "text-ink-muted hover:text-ink"}`}>
            {tBrands("onSale")}
            {onSaleCount > 0 && <span className={`rounded-full px-1.5 text-[11px] ${onSale ? "bg-white/20" : "bg-surface-3 text-ink-soft"}`}>{onSaleCount}</span>}
          </Link>
        </div>
        <nav aria-label={tBrands("sortLabel")} className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]! [&::-webkit-scrollbar]:hidden">
          {SORTS.map((s) => (
            <Link
              key={s}
              href={href({ sort: s })}
              aria-current={sort === s ? "true" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${sort === s ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-muted hover:border-primary/40 hover:text-ink"}`}
            >
              {sortLabels[s]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {loadError && <ErrorState message={t("error")} />}

        {!loadError && products.length === 0 && <EmptyState icon={<Tag className="h-16 w-16" strokeWidth={1.25} aria-hidden="true" />} title={t("noProductsForBrand")} />}

        {!loadError && products.length > 0 && (
          <>
            <ProductGrid>
              {products.map((product, idx) => (
                <ProductCard key={product.id} product={product} brandName={brand.name} priority={idx < 4} />
              ))}
            </ProductGrid>

            <CatalogPagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              hrefFor={(p) => href({ page: p })}
              label={t("paginationLabel")}
            />
          </>
        )}
      </div>

      {otherBrands.length > 0 && (
        <section className="mt-16">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight text-ink">{t("otherBrands")}</h2>
            <Link href="/brands" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              {tBrands("title")}
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4">
            <BrandGrid dense>
              {otherBrands.map((b) => (
                <BrandCard key={b.id} brand={b} />
              ))}
            </BrandGrid>
          </div>
        </section>
      )}
    </div>
  );
}
