import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import AskAdvisorButton from "@/components/AskAdvisorButton";
import { EmptyState, ErrorState } from "@/components/ui";
import { getGuides, type GuideCard, type GuideTopic } from "@/lib/guides-api";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";
import { localizedPath, type Locale } from "@/i18n/config";

export const revalidate = 600;

const TOPIC_ORDER: GuideTopic[] = ["usage", "product", "faq", "policy"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guides");
  return pageMetadata({ path: "/guides", title: { absolute: t("metaTitle") }, description: t("metaDescription") });
}

/**
 * Advice centre: the AI advisor's knowledge base as indexable pages in uz / ru / en -- what people actually search
 * ("kreatin qanday ichiladi", "kuniga qancha oqsil kerak") and what AI answer engines quote. Grouped by topic.
 */
export default async function GuidesPage() {
  const t = await getTranslations("guides");
  const locale = (await getLocale()) as Locale;
  let guides: GuideCard[] | null = null;
  try {
    guides = await getGuides(locale);
  } catch {
    guides = null;
  }

  const groups = TOPIC_ORDER.map((topic) => ({ topic, items: (guides ?? []).filter((g) => g.topic === topic) })).filter((g) => g.items.length);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("title"),
    itemListElement: (guides ?? []).map((g, i) => ({ "@type": "ListItem", position: i + 1, name: g.title, url: absoluteUrl(localizedPath(`/guides/${g.slug}`, locale)) })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <JsonLd data={[breadcrumbJsonLd([{ name: t("home"), path: "/" }, { name: t("breadcrumb"), path: "/guides" }], locale), itemList]} />
      <nav aria-label={t("breadcrumb")} className="mb-5 flex items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/" className="transition-colors hover:text-primary">{t("home")}</Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-ink-muted">{t("breadcrumb")}</span>
      </nav>

      <section className="nz-glass relative mb-8 overflow-hidden rounded-3xl p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_90%_at_0%_0%,rgba(var(--nz-primary-rgb),0.18),transparent_60%)]" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t("eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">{t("subtitle")}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AskAdvisorButton label={t("ask")} />
            {guides && <span className="text-sm text-ink-soft">{t("count", { count: guides.length })}</span>}
          </div>
        </div>
      </section>

      {guides === null ? (
        <ErrorState message={t("loadError")} />
      ) : groups.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-10 w-10" strokeWidth={1.4} aria-hidden="true" />} title={t("empty")} />
      ) : (
        <div className="space-y-10">
          {groups.map(({ topic, items }) => (
            <section key={topic} aria-labelledby={`guides-${topic}`}>
              <h2 id={`guides-${topic}`} className="mb-4 text-xl font-bold text-ink">{t(`topics.${topic}`)}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guides/${g.slug}`} className="nz-glass nz-glass-interactive group flex h-full flex-col rounded-2xl p-4">
                      <span className="text-[15px] font-semibold leading-snug text-ink group-hover:text-primary">{g.title}</span>
                      <span className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink-muted">{g.summary.replace(/\*\*/g, "")}</span>
                      <span className="mt-auto pt-3 text-xs font-semibold text-primary">{t("read")} →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
