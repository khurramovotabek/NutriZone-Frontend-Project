import Link from "next/link";
import type { Metadata } from "next";
import { Award, Scale } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import AddToCartButton from "@/components/AddToCartButton";
import ProductMediaImage from "@/components/ProductMediaImage";
import { CompareRemove, CompareSync } from "@/components/compare/CompareActions";
import { EmptyState } from "@/components/ui";
import { getBrandNameMap, getProductBySlug, type ProductCard } from "@/lib/api";
import { COMPARE_MAX } from "@/lib/compare-limits";
import { formatWeight } from "@/lib/format-weight";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("compare"))("title"), robots: { index: false, follow: true } };
}

function BestBadge({ label }: { label: string }) {
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
      <Award className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
      {label}
    </span>
  );
}

function som(n: number): string {
  return Math.round(n).toLocaleString("en-US").replace(/,/g, " ");
}

function inStock(p: ProductCard): boolean {
  return p.variants?.length ? p.variants.some((v) => (v.stock_quantity ?? 0) > 0) : (p.stock_quantity ?? 0) > 0;
}

/** Price of one serving -- the honest way to compare a 908 g tub with a 2.27 kg one. Null without the servings count. */
function perServing(p: ProductCard): number | null {
  const servings = p.nutrition?.servings_per_container;
  return p.price && servings ? Number(p.price) / servings : null;
}

/**
 * Side-by-side comparison of up to four products (`/compare?items=slug,slug`): price, price per serving, size,
 * serving facts, rating, stock and goals -- the best value in each comparable row is marked. The URL is the list,
 * so a comparison can be shared.
 */
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ items?: string }> }) {
  const t = await getTranslations("compare");
  const locale = await getLocale();
  const slugs = [...new Set(((await searchParams).items ?? "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, COMPARE_MAX);

  const [loaded, brandNames] = await Promise.all([
    Promise.all(slugs.map((slug) => getProductBySlug(slug, locale).then((r) => r.data).catch(() => null))),
    getBrandNameMap(),
  ]);
  const products = loaded.filter((p): p is ProductCard => p !== null);
  const liveSlugs = products.map((p) => p.slug);

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <CompareSync slugs={[]} />
        <EmptyState icon={<Scale className="h-14 w-14" strokeWidth={1.25} aria-hidden="true" />} title={t("emptyTitle")} description={t("emptyText")}
          action={<Link href="/products" className="nz-cta inline-flex rounded-full px-5 py-2.5 text-sm font-semibold">{t("browse")}</Link>} />
      </div>
    );
  }

  const servingPrices = products.map(perServing);
  const cheapestServing = Math.min(...servingPrices.filter((v): v is number => v !== null));
  const ratings = products.map((p) => (p.rating_count > 0 ? p.rating_average ?? 0 : null));
  const bestRating = Math.max(...ratings.filter((v): v is number => v !== null));
  // whole-pack prices of different sizes aren't comparable -- "best" is marked on price per serving and rating only
  const prices = products.map((p) => (p.price ? Number(p.price) : null));
  const showBest = products.length > 1;

  const rows: { label: string; cells: React.ReactNode[] }[] = [
    { label: t("price"), cells: products.map((p, i) => (prices[i] !== null ? <span key={p.id} className="font-bold text-ink">{som(prices[i]!)} {p.currency}</span> : "—")) },
    { label: t("pricePerServing"), cells: products.map((p, i) => (servingPrices[i] !== null ? <span key={p.id} className="font-semibold">≈ {som(servingPrices[i]!)} {p.currency}{showBest && servingPrices[i] === cheapestServing && <BestBadge label={t("best")} />}</span> : <span key={p.id} className="text-ink-soft">{t("noServings")}</span>)) },
    { label: t("size"), cells: products.map((p) => { const v = p.variants?.find((x) => x.is_default) ?? p.variants?.[0]; return formatWeight(v?.weight_value, v?.weight_unit) ?? "—"; }) },
    { label: t("servings"), cells: products.map((p) => (p.nutrition?.servings_per_container ? t("servingsValue", { count: p.nutrition.servings_per_container, grams: p.nutrition.serving_size_grams ?? "—" }) : "—")) },
    { label: t("calories"), cells: products.map((p) => (p.nutrition?.calories ? `${Math.round(p.nutrition.calories)} kkal` : "—")) },
    { label: t("rating"), cells: products.map((p, i) => (ratings[i] !== null ? <span key={p.id}>⭐ {p.rating_average?.toFixed(1)} <span className="text-ink-soft">({p.rating_count})</span>{showBest && ratings[i] === bestRating && <BestBadge label={t("best")} />}</span> : <span key={p.id} className="text-ink-soft">{t("noRating")}</span>)) },
    { label: t("availability"), cells: products.map((p) => (inStock(p) ? <span key={p.id} className="text-emerald-600 dark:text-emerald-400">✓ {t("inStock")}</span> : <span key={p.id} className="text-ink-soft">{t("outOfStock")}</span>)) },
    { label: t("goals"), cells: products.map((p) => (p.goals?.length ? p.goals.map((g) => t(`goal.${g}` as "goal.muscle")).join(", ") : "—")) },
    { label: t("flavours"), cells: products.map((p) => (p.flavours?.length ? p.flavours.map((f) => f.name).join(", ") : "—")) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <CompareSync slugs={liveSlugs} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            <Scale className="h-6 w-6 text-primary" strokeWidth={1.9} aria-hidden="true" />
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
        </div>
        {products.length < COMPARE_MAX && <Link href="/products" className="text-sm font-semibold text-primary hover:underline">+ {t("addMore")}</Link>}
      </div>

      <div className="nz-glass mt-6 overflow-x-auto rounded-3xl">
        <table className="w-full min-w-[560px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-32 bg-surface/95 p-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft backdrop-blur sm:w-40" scope="col">
                <span className="sr-only">{t("feature")}</span>
              </th>
              {products.map((p) => (
                <th key={p.id} scope="col" className="p-3 align-top font-normal">
                  <div className="relative max-w-[200px]">
                    <CompareRemove slug={p.slug} slugs={liveSlugs} />
                    <Link href={`/products/${p.slug}`} className="relative block aspect-square overflow-hidden rounded-2xl bg-white">
                      <ProductMediaImage src={p.primary_image_path} size="medium" alt={p.name} padding="p-3" sizes="200px" fallbackIcon={<Scale className="h-8 w-8 text-ink-soft" aria-hidden="true" />} />
                    </Link>
                    {p.brand_id && brandNames[p.brand_id] && <p className="mt-2 truncate text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{brandNames[p.brand_id]}</p>}
                    <Link href={`/products/${p.slug}`} className="mt-0.5 line-clamp-2 text-left text-sm font-semibold text-ink hover:text-primary">{p.name}</Link>
                    {p.default_variant_id && <AddToCartButton variantId={p.default_variant_id} className="mt-3 w-full" outOfStock={!inStock(p)} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border/60">
                <th scope="row" className="sticky left-0 z-10 bg-surface/95 p-3 text-left text-xs font-semibold text-ink-muted backdrop-blur">{row.label}</th>
                {row.cells.map((cell, i) => (
                  <td key={products[i].id} className="p-3 align-top text-ink">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {servingPrices.every((v) => v === null) && <p className="mt-3 text-xs text-ink-soft">{t("servingsHint")}</p>}
    </div>
  );
}
