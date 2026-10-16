import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Headphones, Package, Send, ShoppingBag, Zap } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getBanners, getBestSellers, getBrandNameMap, getProducts, type Banner } from "@/lib/api";
import { getPublicSiteSettings } from "@/lib/settings-api";
import { getBrand } from "@/lib/brand";
import SiteJsonLd from "@/components/SiteJsonLd";
import { Button } from "@/components/ui";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import ProductGrid from "@/components/ProductGrid";
import TrustBar from "@/components/TrustBar";
import HeroSlider from "@/components/HeroSlider";
import BlogSection from "@/components/BlogSection";
import BrandStrip from "@/components/home/BrandStrip";
import GoalsSection from "@/components/home/GoalsSection";
import ForYouSection from "@/components/home/ForYouSection";
import ReviewsWall from "@/components/home/ReviewsWall";
import TelegramSubscribe from "@/components/home/TelegramSubscribe";
import LoyaltyBanner from "@/components/home/LoyaltyBanner";
import ProductShowcase, { type ShowcaseTab } from "@/components/home/ProductShowcase";
import QuickNav from "@/components/home/QuickNav";
import StoresSection from "@/components/home/StoresSection";

function ProductGridSkeleton() {
  return (
    <div className="mt-16">
      <ProductGrid>
        {Array.from({ length: 4 }, (_, i) => (
          <ProductCardSkeleton key={i} variant="featured" />
        ))}
      </ProductGrid>
    </div>
  );
}

/** Best sellers (real order data) + the newest catalogue products, as one tabbed showcase. */
async function Showcase() {
  const locale = await getLocale();
  const [best, latest, brandNames] = await Promise.all([
    getBestSellers(8, locale).then((r) => r.data).catch(() => []),
    getProducts({ pageSize: 8, locale }).then((r) => r.data).catch(() => []),
    getBrandNameMap().catch(() => ({}) as Record<string, string>),
  ]);
  const tabs: ShowcaseTab[] = [];
  if (best.length) tabs.push({ key: "bestSellers", products: best });
  if (latest.length) tabs.push({ key: "featured", products: latest });
  if (!tabs.length) return null;
  return <ProductShowcase tabs={tabs} brandNames={brandNames} />;
}

const WHY_NUTRIZONE_ITEMS = [
  { icon: BadgeCheck, key: "quality" },
  { icon: ShoppingBag, key: "selection" },
  { icon: Package, key: "ordering" },
  { icon: Headphones, key: "support" },
] as const;

async function WhyNutriZone() {
  const t = await getTranslations("home.whyNutriZone");

  return (
    <section className="mt-16">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{t("eyebrow")}</p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("title")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-muted sm:text-base">{t("subtitle")}</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WHY_NUTRIZONE_ITEMS.map(({ icon: Icon, key }, i) => (
          <div key={key} className="nz-glass nz-glass-interactive group relative overflow-hidden rounded-3xl p-6">
            <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-4 select-none text-7xl font-black text-ink/[0.04] transition-colors group-hover:text-primary/10">
              0{i + 1}
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/25 transition-transform group-hover:-translate-y-0.5">
              <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-base font-bold text-ink">{t(`${key}.title`)}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{t(`${key}.description`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const locale = await getLocale();

  let banners: Banner[] = [];
  try {
    const result = await getBanners(locale);
    banners = result.data;
  } catch {
    banners = [];
  }
  const site = await getPublicSiteSettings().then((r) => r.data).catch(() => null);
  const telegram = site?.telegram_channel_url || (site?.telegram_username ? `https://t.me/${site.telegram_username.replace(/^@/, "")}` : null);

  const brand = await getBrand();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SiteJsonLd name={brand.name} logoUrl={brand.logoUrl} site={site} telegramUrl={telegram} />
      {banners.length > 0 ? (
        <HeroSlider banners={banners} />
      ) : (
        <section className="nz-glass nz-glow relative overflow-hidden rounded-3xl px-6 py-14 sm:px-12 sm:py-20">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Zap className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {t("hero.eyebrow")}
          </div>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">{t("hero.title")}</h1>
          <p className="mt-4 max-w-xl text-base text-ink-muted sm:text-lg">{t("hero.subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products">
              <Button variant="primary">{t("hero.cta")}</Button>
            </Link>
            <Link href="/products?sale=1">
              <Button variant="secondary">{t("hero.secondaryCta")}</Button>
            </Link>
          </div>
        </section>
      )}

      <Suspense fallback={null}>
        <QuickNav />
      </Suspense>

      <section className="mt-8">
        <TrustBar />
      </section>

      <Suspense fallback={<ProductGridSkeleton />}>
        <Showcase />
      </Suspense>

      <Suspense fallback={null}>
        <ForYouSection />
      </Suspense>

      <Suspense fallback={null}>
        <GoalsSection />
      </Suspense>

      <Suspense fallback={null}>
        <LoyaltyBanner />
      </Suspense>

      <Suspense fallback={null}>
        <BrandStrip />
      </Suspense>

      <Suspense fallback={null}>
        <ReviewsWall />
      </Suspense>

      <Suspense fallback={null}>
        <StoresSection />
      </Suspense>

      <WhyNutriZone />

      <Suspense fallback={null}>
        <TelegramSubscribe />
      </Suspense>

      <Suspense fallback={null}>
        <BlogSection />
      </Suspense>

      <section className="relative mt-16 overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-blue-600 to-indigo-700 px-6 py-12 text-center text-white shadow-2xl shadow-primary/25 sm:px-12 sm:py-16">
        <span aria-hidden="true" className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="relative">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{t("finalCta.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/80 sm:text-base">{t("finalCta.subtitle")}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/products" className="group inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-primary shadow-lg transition-transform hover:-translate-y-0.5">
              {t("finalCta.cta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} aria-hidden="true" />
            </Link>
            {telegram && (
              <a href={telegram} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20">
                <Send className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                {t("finalCta.telegram")}
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
