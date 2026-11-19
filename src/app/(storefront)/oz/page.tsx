import Link from "next/link";
import type { Metadata } from "next";
import { ChevronDown, MapPin, Phone, ShieldCheck, Store, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getBrands, getCategories, type Category } from "@/lib/api";
import { getStores, type StoreListItem } from "@/lib/store-api";
import { categoryPath } from "@/lib/entity-paths";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import { KEEP_LATIN, toUzCyrillic } from "@/lib/uz-cyrillic";

/**
 * /oz -- the shop in Uzbek Cyrillic ("Ўзбекча"): many people still type and search in Cyrillic
 * ("Тошкентда спорт озуқалари", "протеин қаердан олса бўлади"), and every other page is Latin Uzbek, Russian or
 * English. The page carries the home page's own words (intro, FAQ, popular searches), every category and every
 * branch with its address -- transliterated from the Latin texts at render time, so it never drifts from them.
 * Linked from the footer, listed in the sitemap, an hreflang `uz-Cyrl` alternate of the home page.
 */
export const revalidate = 3600;

const BRAND = "NUTRIZONE";
const FAQ = ["1", "2", "3", "4", "5"] as const;
const POPULAR = ["sport", "protein", "creatine", "gainer", "bcaa", "vitamins", "omega", "preworkout"] as const;

async function safely<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

const TITLE = "NUTRIZONE — Тошкентда спорт озуқалари ва витаминлар: протеин, гейнер, креатин";
const DESCRIPTION =
  "Оригинал спорт озуқалари дўкони: протеин, гейнер, креатин, BCAA, аминокислоталар ва витаминлар. Тошкент ва Ўзбекистон бўйлаб етказиб бериш, филиаллардан олиб кетиш, NutriZone Coins кешбек.";

export function generateMetadata(): Metadata {
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: {
      canonical: absoluteUrl("/oz"),
      languages: { "uz-Cyrl": absoluteUrl("/oz"), uz: SITE_URL, ru: absoluteUrl("/ru"), en: absoluteUrl("/en"), "x-default": SITE_URL },
    },
    openGraph: { title: TITLE, description: DESCRIPTION, url: absoluteUrl("/oz"), siteName: BRAND, locale: "uz_UZ", type: "website", images: [absoluteUrl("/og-image")] },
  };
}

export default async function UzCyrillicPage() {
  const t = await getTranslations({ locale: "uz", namespace: "seo" });
  const [categories, brands, stores] = await Promise.all([
    safely(() => getCategories("uz").then((r) => r.data), [] as Category[]),
    safely(() => getBrands("uz").then((r) => r.data), []),
    safely(() => getStores().then((r) => r.results), [] as StoreListItem[]),
  ]);
  const keep = [...KEEP_LATIN, ...brands.map((b) => b.name), ...stores.map((s) => s.name)];
  const cy = (s: string) => toUzCyrillic(s, keep);

  const top = categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);
  const branches = stores.filter((s) => s.status === "active");
  const faq = FAQ.map((k) => ({ q: cy(t(`faq.q${k}`)), a: cy(t(`faq.a${k}`, { brand: BRAND })) }));

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${absoluteUrl("/oz")}#page`,
      url: absoluteUrl("/oz"),
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "uz-Cyrl",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "uz-Cyrl", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <main lang="uz-Cyrl" className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />

      <section className="nz-glass rounded-3xl p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Ўзбекча · кирилл ёзувида</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-4xl">{TITLE}</h1>
        <div className="mt-5 space-y-3 text-sm leading-relaxed text-ink-muted sm:text-base">
          <p>{cy(t("intro.p1", { brand: BRAND }))}</p>
          <p>{cy(t("intro.p2"))}</p>
          <p>{cy(t("intro.p3"))}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
          <Link href="/products" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-white transition-opacity hover:opacity-90">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Каталогни очиш
          </Link>
          <Link href="/stores" className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2.5 text-primary hover:bg-primary/15">
            <Store className="h-4 w-4" aria-hidden="true" /> Филиаллар харитада
          </Link>
          <Link href="/delivery" className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2.5 text-primary hover:bg-primary/15">
            <Truck className="h-4 w-4" aria-hidden="true" /> Етказиб бериш
          </Link>
        </div>
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Оммабоп қидирувлар">
          {POPULAR.map((k) => (
            <li key={k}>
              <Link href={`/products?q=${encodeURIComponent(t(`popular.q.${k}`))}`} className="inline-block rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:border-primary/40 hover:text-primary">
                {cy(t(`popular.label.${k}`))}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {top.length > 0 && (
        <section className="mt-8" aria-labelledby="oz-cats">
          <h2 id="oz-cats" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Маҳсулот турлари</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((c) => (
              <div key={c.id} className="nz-glass rounded-2xl p-5">
                <Link href={categoryPath(c, "uz")} className="text-base font-bold text-ink hover:text-primary">{cy(c.name)}</Link>
                {childrenOf(c.id).length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
                    {childrenOf(c.id).slice(0, 12).map((s) => (
                      <li key={s.id}><Link href={categoryPath(s, "uz")} className="hover:text-primary">{cy(s.name)}</Link></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {branches.length > 0 && (
        <section className="mt-8" aria-labelledby="oz-stores">
          <h2 id="oz-stores" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Филиалларимиз — {branches.length} та дўкон</h2>
          <p className="mt-1 text-sm text-ink-muted">Манзил, телефон ва бугунги иш вақти — ҳар бир филиал саҳифасида; харитада энг яқинини топинг.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((s) => (
              <li key={s.id} className="nz-glass rounded-2xl p-4">
                <Link href={`/store/${s.slug}`} className="font-bold text-ink hover:text-primary">{s.name}</Link>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {cy([s.address, s.district, s.city].filter(Boolean).join(", "))}
                </p>
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <Phone className="h-4 w-4" aria-hidden="true" /> {s.phone}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 nz-glass rounded-3xl p-6 sm:p-8" aria-labelledby="oz-faq">
        <h2 id="oz-faq" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{cy(t("faq.title"))}</h2>
        <div className="mt-4 divide-y divide-border">
          {faq.map((f) => (
            <details key={f.q} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-ink sm:text-[15px]">
                {f.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-8 text-center text-sm text-ink-muted">
        Сайтнинг бошқа тиллари: <Link href="/" className="font-semibold text-primary">Oʻzbekcha (lotin)</Link> ·{" "}
        <Link href="/ru" prefetch={false} className="font-semibold text-primary">Русский</Link> · <Link href="/en" prefetch={false} className="font-semibold text-primary">English</Link>
      </p>
    </main>
  );
}
