import Link from "next/link";
import { ChevronDown, Store, Coins, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const FAQ_KEYS = ["1", "2", "3", "4", "5"] as const;
const POPULAR = ["sport", "protein", "creatine", "gainer", "bcaa", "vitamins", "omega", "preworkout", "guides"] as const;

/**
 * "Original sports nutrition in Tashkent" -- the home page's own words about what the store sells, where and
 * how, plus the frequently asked questions (also published as FAQPage JSON-LD by SiteJsonLd). Search engines
 * rank a page by its visible text; the catalog alone is product cards with no prose.
 */
export default async function SeoIntro({ brand }: { brand: string }) {
  const t = await getTranslations("seo");
  return (
    <section className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" aria-labelledby="nz-seo-intro">
      <div className="nz-glass rounded-3xl p-6 sm:p-8">
        <h2 id="nz-seo-intro" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{t("intro.title")}</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-muted sm:text-[15px]">
          <p>{t("intro.p1", { brand })}</p>
          <p>{t("intro.p2")}</p>
          <p>{t("intro.p3")}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
          <Link href="/products" className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-primary transition-colors hover:bg-primary/15">
            <ShieldCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {t("catalogTitle")}
          </Link>
          <Link href="/stores" className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-primary transition-colors hover:bg-primary/15">
            <Store className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {t("storesTitle")}
          </Link>
          <Link href="/loyalty" className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-primary transition-colors hover:bg-primary/15">
            <Coins className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            NutriZone Coins
          </Link>
        </div>
        {/* what people type into Google ("sport pitaniya", "kreatin narxi") as real links -- keyword anchors for search engines, shortcuts for people */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">{t("popular.title")}</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {POPULAR.map((key) => (
              <li key={key}>
                <Link href={key === "guides" ? "/guides" : `/products?q=${encodeURIComponent(t(`popular.q.${key}`))}`} className="inline-block rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-primary/40 hover:text-primary">
                  {t(`popular.label.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="nz-glass rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{t("faq.title")}</h2>
        <div className="mt-4 divide-y divide-border">
          {FAQ_KEYS.map((k) => (
            <details key={k} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-ink sm:text-[15px]">
                {t(`faq.q${k}`)}
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180" strokeWidth={2} aria-hidden="true" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(`faq.a${k}`, { brand })}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
