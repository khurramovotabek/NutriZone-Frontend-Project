import Link from "next/link";
import type { Metadata } from "next";
import { AppWindow, ArrowRight, CheckCircle2, ChevronDown, HardDrive, Map, Monitor, MousePointerClick, RefreshCw, Smartphone, WifiOff } from "lucide-react";
import { getLocale } from "next-intl/server";
import InstallAppButton from "@/components/pwa/InstallAppButton";
import JsonLd from "@/components/JsonLd";
import { appPageInfo } from "@/lib/app-page-info";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { localizedPath, type Locale } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = appPageInfo(await getLocale());
  return pageMetadata({ path: "/app", title: t.metaTitle, description: t.metaDescription });
}

const PLATFORM_ICON = { android: Smartphone, ios: Smartphone, desktop: Monitor } as const;
const PLATFORM_TONE = {
  android: "from-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  ios: "from-sky-500/20 text-sky-600 dark:text-sky-400",
  desktop: "from-violet-500/20 text-violet-600 dark:text-violet-400",
} as const;
const PERK_ICONS = [MousePointerClick, AppWindow, HardDrive, RefreshCw, WifiOff, Map];
const SCREENS = ["home", "catalog", "product"] as const;

/** `/app` -- how to install the site as an app on Android, iPhone and a computer (no Play Store / App Store). */
export default async function AppPage() {
  const locale = (await getLocale()) as Locale;
  const t = appPageInfo(locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: "NUTRIZONE", path: "/" }, { name: t.eyebrow, path: "/app" }], locale),
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "NutriZone",
            url: absoluteUrl("/"),
            applicationCategory: "ShoppingApplication",
            operatingSystem: "Android, iOS, Windows, macOS",
            browserRequirements: "Chrome, Safari, Edge, Samsung Internet, Yandex Browser",
            image: absoluteUrl("/pwa/icon-512.png"),
            screenshot: SCREENS.map((s) => absoluteUrl(`/pwa/screens/${s}.jpg`)),
            offers: { "@type": "Offer", price: "0", priceCurrency: "UZS" },
            inLanguage: locale,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            url: absoluteUrl(localizedPath("/app", locale)),
            mainEntity: t.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(120%_120%_at_0%_0%,#1d4ed8_0%,#0b1220_55%,#060907_100%)] px-5 pb-10 pt-8 text-white sm:px-10 sm:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- static app icon */}
              <img src="/pwa/icon-192.png" alt="NutriZone" width={192} height={192} className="h-14 w-14 rounded-[22%] shadow-[0_12px_30px_-8px_rgba(29,78,216,0.8)] ring-1 ring-white/15" />
              <p className="rounded-full bg-white/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white/90">{t.eyebrow}</p>
            </div>
            <h1 className="mt-5 text-[1.9rem] font-black leading-[1.1] tracking-tight sm:text-5xl">{t.title}</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-base">{t.lead}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <InstallAppButton variant="hero" label={t.cta} />
              <span className="nz-installed-only items-center gap-2 rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-300">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                {t.installed}
              </span>
              <a href="#install-steps" className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white/85 ring-1 ring-white/20 transition-colors hover:bg-white/10">
                {t.platformsTitle}
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2">
              {t.chips.map((c) => (
                <li key={c} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          {/* phone mock-up with the real home screen */}
          <div className="relative mx-auto hidden w-[230px] sm:block">
            <div className="rounded-[2.6rem] bg-[#0f172a] p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/15">
              <div className="relative overflow-hidden rounded-[2.1rem] bg-black">
                <span aria-hidden="true" className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
                {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot */}
                <img src="/pwa/screens/home.jpg" alt="" width={780} height={1688} className="block aspect-[780/1688] w-full object-cover object-top" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps per platform */}
      <section id="install-steps" className="scroll-mt-24 pt-10">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t.platformsTitle}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {t.platforms.map((p) => {
            const Icon = PLATFORM_ICON[p.key];
            return (
              <article key={p.key} id={p.key} className={`nz-glass relative scroll-mt-24 overflow-hidden rounded-3xl bg-gradient-to-br ${PLATFORM_TONE[p.key]} to-transparent p-5 sm:p-6`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface shadow-sm">
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold text-ink">{p.title}</h3>
                    <p className="truncate text-xs font-medium text-ink-soft">{p.browsers}</p>
                  </div>
                </div>
                <ol className="mt-5 space-y-3">
                  {p.steps.map((s, i) => (
                    <li key={s} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-extrabold text-white">{i + 1}</span>
                      <span className="pt-0.5 text-[14px] font-semibold leading-snug text-ink">{s}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 rounded-2xl bg-surface/70 px-3.5 py-2.5 text-xs leading-relaxed text-ink-muted">{p.note}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Perks */}
      <section className="pt-10">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t.perksTitle}</h2>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {t.perks.map((p, i) => {
            const Icon = PERK_ICONS[i] ?? CheckCircle2;
            return (
              <li key={p.title} className="nz-glass flex gap-3.5 rounded-2xl p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-ink">{p.title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{p.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Screens */}
      <section className="pt-10">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t.previewTitle}</h2>
        <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {SCREENS.map((s) => (
            <div key={s} className="w-[62%] shrink-0 snap-center sm:w-auto">
              <div className="overflow-hidden rounded-[1.8rem] bg-[#0f172a] p-2 shadow-xl ring-1 ring-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot */}
                <img src={`/pwa/screens/${s}.jpg`} alt="" width={780} height={1688} loading="lazy" className="block aspect-[780/1400] w-full rounded-[1.4rem] object-cover object-top" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="pt-10">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t.faqTitle}</h2>
        <div className="mt-5 space-y-3">
          {t.faq.map((f) => (
            <details key={f.q} className="nz-glass group rounded-2xl px-4 py-1 sm:px-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[15px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <InstallAppButton variant="footer" />
        <Link href="/products" className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-soft">
          {t.shopCta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
