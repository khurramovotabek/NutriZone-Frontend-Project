import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import AskAdvisorButton from "@/components/AskAdvisorButton";
import ProductCard from "@/components/ProductCard";
import RichText from "@/components/assistant/RichText";
import { ErrorState } from "@/components/ui";
import { ApiError, searchProducts, type ProductCard as ProductCardData } from "@/lib/api";
import { getGuide, plainAnswer, type GuideDetail } from "@/lib/guides-api";
import { breadcrumbJsonLd, clip, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";
import { localizedPath, type Locale } from "@/i18n/config";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations("guides");
  try {
    const guide = await getGuide(slug, await getLocale());
    return pageMetadata({ path: `/guides/${guide.slug}`, title: `${guide.title} — ${t("title")}`, description: plainAnswer(guide.answer), type: "article" });
  } catch {
    return { title: t("title") };
  }
}

/** One guide: the answer, matching in-stock products, related guides, and Article + FAQPage structured data. */
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("guides");
  const locale = (await getLocale()) as Locale;

  let guide: GuideDetail;
  try {
    guide = await getGuide(slug, locale);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    return <ErrorState message={t("loadError")} />;
  }

  let products: ProductCardData[] = [];
  if (guide.product_query) {
    try {
      products = (await searchProducts({ q: guide.product_query, pageSize: 4, inStock: true, locale })).data;
    } catch {
      products = [];
    }
  }

  const url = absoluteUrl(localizedPath(`/guides/${guide.slug}`, locale));
  const answer = plainAnswer(guide.answer);
  const structured = [
    breadcrumbJsonLd([{ name: t("home"), path: "/" }, { name: t("breadcrumb"), path: "/guides" }, { name: guide.title, path: `/guides/${guide.slug}` }], locale),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: clip(guide.title, 110),
      description: clip(answer, 200),
      inLanguage: locale,
      dateModified: guide.updated_at,
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "NUTRIZONE", url: absoluteUrl("/") },
      publisher: { "@id": `${absoluteUrl("/")}#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: guide.title.endsWith("?") ? guide.title : `${guide.title}?`, acceptedAnswer: { "@type": "Answer", text: answer } }],
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <JsonLd data={structured} />
      <nav aria-label={t("breadcrumb")} className="mb-5 flex min-w-0 items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/" className="shrink-0 transition-colors hover:text-primary">{t("home")}</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <Link href="/guides" className="shrink-0 transition-colors hover:text-primary">{t("breadcrumb")}</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span className="truncate text-ink-muted">{guide.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t(`topics.${guide.topic}`)}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{guide.title}</h1>
          <p className="mt-2 text-xs text-ink-soft">{t("updated", { date: new Date(guide.updated_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) })}</p>
          <div className="nz-glass mt-5 rounded-2xl p-5 text-[15px] leading-relaxed text-ink-muted sm:p-6">
            <RichText text={guide.answer} />
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t("disclaimer")}
          </p>

          {products.length > 0 && (
            <section className="mt-8" aria-labelledby="guide-products">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="guide-products" className="text-lg font-bold text-ink">{t("relatedProducts")}</h2>
                <Link href={`/products?q=${encodeURIComponent(guide.product_query)}`} className="text-sm font-semibold text-primary">{t("allProducts")} →</Link>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="nz-glass rounded-2xl p-5">
            <p className="text-sm leading-relaxed text-ink-muted">{t("askHint")}</p>
            <div className="mt-3">
              <AskAdvisorButton label={t("ask")} question={guide.title} />
            </div>
          </div>
          {guide.related.length > 0 && (
            <nav className="nz-glass rounded-2xl p-5" aria-labelledby="guide-related">
              <h2 id="guide-related" className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">{t("relatedGuides")}</h2>
              <ul className="space-y-2">
                {guide.related.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guides/${g.slug}`} className="text-sm font-medium text-ink transition-colors hover:text-primary">{g.title}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>
      </div>
    </div>
  );
}
