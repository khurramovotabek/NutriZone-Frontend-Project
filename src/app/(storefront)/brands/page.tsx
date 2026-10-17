import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, ChevronRight, Package, Tag } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBrands, type Brand } from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";
import BrandsGrid from "@/components/BrandsGrid";
import TrustBar from "@/components/TrustBar";
import { EmptyState, ErrorState } from "@/components/ui";
import { getBrand } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [t, { name }] = await Promise.all([getTranslations("seo"), getBrand()]);
  return pageMetadata({ path: "/brands", title: t("brandsTitle"), description: t("brandsDescription", { brand: name }) });
}

export const revalidate = 60;

export default async function BrandsPage() {
  const t = await getTranslations("brands");
  const tNav = await getTranslations("navigation");

  const locale = await getLocale();

  let brands: Brand[] = [];
  let loadError = false;
  try {
    brands = (await getBrands(locale)).data;
  } catch {
    loadError = true;
  }

  // Per-brand counts come with GET /brands itself now (published products only).
  const totalProducts = brands.reduce((sum, b) => sum + (b.product_count ?? 0), 0);
  const logoStrip = brands.filter((b) => b.logo_url).slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav aria-label={t("breadcrumbLabel")} className="mb-6 flex items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/" className="transition-colors hover:text-primary">
          {tNav("home")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="font-medium text-ink">{t("title")}</span>
      </nav>

      <section className="nz-glass nz-rise relative overflow-hidden rounded-3xl">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_0%_0%,rgba(var(--nz-primary-rgb),0.2),transparent_60%)]" />
          <div className="nz-orb -right-16 -top-24 h-64 w-64 bg-[rgba(var(--nz-primary-rgb),0.2)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--nz-primary-rgb),0.5)] to-transparent" />
        </div>
        <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">{t("title")}</h1>
            <p className="mt-3 max-w-xl text-sm text-ink-muted sm:text-base">{t("subtitle")}</p>
            {!loadError && brands.length > 0 && (
              <dl className="mt-7 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-border/70 bg-surface/55 px-5 py-3 backdrop-blur-sm">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                    <Tag className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
                    {t("statBrands")}
                  </dt>
                  <dd className="mt-0.5 text-2xl font-extrabold tabular-nums text-ink">{brands.length}</dd>
                </div>
                {totalProducts > 0 && (
                  <div className="rounded-2xl border border-border/70 bg-surface/55 px-5 py-3 backdrop-blur-sm">
                    <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                      <Package className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
                      {t("statProducts")}
                    </dt>
                    <dd className="mt-0.5 text-2xl font-extrabold tabular-nums text-ink">{totalProducts}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
          {logoStrip.length > 0 && (
            <div className="grid grid-cols-3 gap-3 lg:w-80" aria-hidden="true">
              {logoStrip.map((b, i) => (
                <span key={b.id} className={`nz-rise block aspect-square overflow-hidden rounded-2xl border border-border/60 shadow-sm ${i % 2 ? "translate-y-3" : ""}`} style={{ animationDelay: `${i * 70}ms` }}>
                  <BrandLogo name={b.name} logoUrl={b.logo_url} padding="p-3" textSize="text-lg" sizes="96px" />
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-10">
        {loadError && <ErrorState message={t("loadError")} />}

        {!loadError && brands.length === 0 && <EmptyState icon={<Tag className="h-16 w-16" strokeWidth={1.25} aria-hidden="true" />} title={t("noBrandsYet")} />}

        {!loadError && brands.length > 0 && <BrandsGrid brands={brands} />}
      </div>

      <div className="mt-16">
        <TrustBar />
      </div>
    </div>
  );
}
