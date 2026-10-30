import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Headphones,
  LogIn,
  MapPinned,
  MessageCircle,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBrands, getCategories, getProducts, type Brand } from "@/lib/api";
import { getStores } from "@/lib/store-api";
import FullBleedImage from "@/components/FullBleedImage";
import ContactSpotlight from "@/components/contact/ContactSpotlight";
import { getBrand } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo";
import { brandPath } from "@/lib/entity-paths";

const STATS_MIN_PRODUCTS = 20;

export async function generateMetadata(): Promise<Metadata> {
  const [tSeo, { name }] = await Promise.all([getTranslations("seo"), getBrand()]);
  return pageMetadata({ path: "/about", title: tSeo("aboutTitle"), description: tSeo("aboutDescription", { brand: name }) });
}

/**
 * Every number on this page is a live count from the real catalog/store
 * APIs -- never a marketing figure. A count that fails to load (or is 0)
 * is simply left out rather than shown as a guess.
 */
async function loadFacts() {
  const [products, brands, stores, categories] = await Promise.allSettled([getProducts({ pageSize: 1 }), getBrands(), getStores(), getCategories(await getLocale())]);
  return {
    productCount: products.status === "fulfilled" ? (products.value.pagination?.total_count ?? null) : null,
    brands: brands.status === "fulfilled" ? brands.value.data : ([] as Brand[]),
    storeCount: stores.status === "fulfilled" ? stores.value.count : null,
    categoryCount: categories.status === "fulfilled" ? categories.value.data.length : null,
  };
}

export default async function AboutPage() {
  const t = await getTranslations("about");
  const tNav = await getTranslations("navigation");
  const { productCount, brands, storeCount, categoryCount } = await loadFacts();

  const stats = [
    { value: productCount, label: t("stats.products"), icon: PackageSearch },
    { value: brands.length || null, label: t("stats.brands"), icon: Tag },
    { value: storeCount, label: t("stats.stores"), icon: Store },
    { value: categoryCount, label: t("stats.categories"), icon: ShoppingBag },
  ].filter((s): s is { value: number; label: string; icon: typeof Tag } => typeof s.value === "number" && s.value > 0);
  // A handful of items reads as "small shop", not "trusted store" -- the
  // numbers band only appears once the catalog is genuinely substantial.
  const showStats = (productCount ?? 0) >= STATS_MIN_PRODUCTS && stats.length > 0;

  const values = [
    { icon: ShieldCheck, key: "genuine" },
    { icon: ReceiptText, key: "pricing" },
    { icon: MapPinned, key: "stores" },
    { icon: Headphones, key: "support" },
  ] as const;

  const steps = [
    { icon: PackageSearch, key: "browse" },
    { icon: ShoppingCart, key: "cart" },
    { icon: LogIn, key: "confirm" },
    { icon: BadgeCheck, key: "receive" },
  ] as const;

  const principles = ["one", "two", "three"] as const;

  return (
    <ContactSpotlight className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="nz-orb left-[-10%] top-[-8%] h-[420px] w-[420px] bg-primary/25" />
        <div className="nz-orb right-[-12%] top-[18%] h-[460px] w-[460px] bg-emerald-500/15" style={{ animationDelay: "-7s" }} />
        <div className="nz-orb bottom-[5%] left-[20%] h-[360px] w-[360px] bg-sky-400/10" style={{ animationDelay: "-13s" }} />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pt-14">
        <nav aria-label="Breadcrumb" className="mb-10 flex items-center gap-1.5 text-xs text-ink-muted">
          <Link href="/" className="transition-colors hover:text-primary">
            {tNav("home")}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-ink">
            {t("breadcrumb")}
          </span>
        </nav>

        {/* HERO */}
        <header className="nz-rise mx-auto max-w-3xl text-center">
          <span className="nz-liquid inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink-muted">
            <span className="nz-pulse-dot h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            {t("eyebrow")}
          </span>
          <h1 className="nz-gradient-text mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{t("title")}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">{t("intro")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/products" className="nz-cta nz-shimmer-btn inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold">
              <ShoppingBag className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {t("heroPrimary")}
            </Link>
            <Link href="/stores" className="nz-liquid nz-liquid-tile inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-ink hover:text-primary">
              <Store className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {t("heroSecondary")}
            </Link>
          </div>
        </header>

        {/* LIVE FACTS */}
        {showStats && (
          <section aria-label={t("stats.label")} className="nz-liquid nz-rise mt-14 rounded-3xl p-2" style={{ animationDelay: "120ms" }}>
            <dl className={`grid grid-cols-2 ${stats.length >= 4 ? "lg:grid-cols-4" : stats.length === 3 ? "lg:grid-cols-3" : ""}`}>
              {stats.map(({ value, label, icon: Icon }, i) => (
                <div
                  key={label}
                  className={`flex flex-col items-center gap-1 border-border/50 px-4 py-6 text-center ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "border-t lg:border-t-0" : ""} ${i >= 1 ? "lg:border-l" : ""}`}
                >
                  <Icon className="order-1 mb-1 h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />
                  <dt className="order-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">{label}</dt>
                  <dd className="order-2 text-3xl font-extrabold tracking-tight text-ink tabular-nums sm:text-4xl">{value.toLocaleString("en-US")}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* STORY / MISSION */}
        <section className="mt-20 grid items-center gap-10 lg:grid-cols-2">
          <div className="nz-rise">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("mission.eyebrow")}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t("mission.title")}</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">{t("mission.body1")}</p>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">{t("mission.body2")}</p>
          </div>
          <div className="nz-liquid nz-rise rounded-3xl p-6 sm:p-8" style={{ animationDelay: "120ms" }}>
            <p className="text-sm font-semibold text-ink">{t("principles.title")}</p>
            <ul className="mt-5 space-y-5">
              {principles.map((key) => (
                <li key={key} className="flex gap-3.5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" strokeWidth={2} aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-ink">{t(`principles.${key}.title`)}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{t(`principles.${key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* VALUES */}
        <section aria-labelledby="about-values" className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="about-values" className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {t("valuesTitle")}
            </h2>
            <p className="mt-2 text-sm text-ink-muted sm:text-base">{t("valuesSubtitle")}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, key }, i) => (
              <div key={key} className="nz-liquid nz-liquid-tile nz-rise rounded-2xl p-6" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="nz-liquid-icon flex h-12 w-12 items-center justify-center rounded-xl">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-ink">{t(`${key}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{t(`${key}.description`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section aria-labelledby="about-steps" className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="about-steps" className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {t("steps.title")}
            </h2>
            <p className="mt-2 text-sm text-ink-muted sm:text-base">{t("steps.subtitle")}</p>
          </div>
          <ol className="relative mt-10 grid gap-4 md:grid-cols-4">
            <span aria-hidden="true" className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" />
            {steps.map(({ icon: Icon, key }, i) => (
              <li key={key} className="relative flex flex-col items-center text-center">
                <div className="nz-liquid relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl">
                  <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} aria-hidden="true" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-contrast shadow-md">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-ink">{t(`steps.${key}.title`)}</h3>
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-ink-muted">{t(`steps.${key}.body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* BRANDS -- only brands that genuinely exist in the catalog */}
        {brands.length > 0 && (
          <section aria-labelledby="about-brands" className="mt-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="about-brands" className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {t("brands.title")}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">{t("brands.subtitle")}</p>
              </div>
              <Link href="/brands" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                {t("brands.all")}
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {brands.slice(0, 12).map((brand) => (
                <li key={brand.id}>
                  <Link href={brandPath(brand)} className="nz-liquid nz-liquid-tile group flex flex-col overflow-hidden rounded-2xl" title={brand.name}>
                    <div className="relative aspect-[16/10] overflow-hidden bg-white">
                      <FullBleedImage
                        src={brand.logo_url}
                        alt={brand.name}
                        sizes="(max-width: 640px) 50vw, 180px"
                        className="transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                        fallbackIcon={<Tag className="h-7 w-7 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />}
                      />
                    </div>
                    <p className="truncate px-3 py-2.5 text-center text-xs font-semibold text-ink group-hover:text-primary">{brand.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <section className="nz-liquid relative mt-20 overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/15 via-transparent to-emerald-500/10" />
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("cta.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-base">{t("cta.subtitle")}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/products" className="nz-cta nz-shimmer-btn inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold">
              {t("cta.button")}
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link href="/contact" className="nz-liquid nz-liquid-tile inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-ink hover:text-primary">
              <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {t("cta.contact")}
            </Link>
          </div>
        </section>
      </div>
    </ContactSpotlight>
  );
}
