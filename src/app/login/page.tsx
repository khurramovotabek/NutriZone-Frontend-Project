import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import BrandMark from "@/components/BrandMark";
import LoginCodeForm from "@/components/LoginCodeForm";
import LoginLanguageSwitcher from "@/components/LoginLanguageSwitcher";
import CoinIcon from "@/components/loyalty/CoinIcon";
import { getBrand } from "@/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("meta"))("login"), robots: { index: false, follow: false } };
}

/**
 * Standalone sign-in (outside the storefront chrome), always dark: a
 * brand panel (desktop) beside a liquid-glass sign-in card. Phones get
 * the card first with a compact brand header; the value points follow
 * underneath. Sign-in itself is Telegram-code only (see LoginCodeForm).
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const t = await getTranslations("auth");
  const tp = await getTranslations("auth.loginPage");
  const locale = await getLocale();
  const brand = await getBrand();
  const redirectTo = next ?? "/";

  const features = [
    { icon: ShieldCheck, title: t("features.secureTitle"), body: t("features.secureBody") },
    { icon: Zap, title: t("features.fastTitle"), body: t("features.fastBody") },
    { icon: Sparkles, title: t("features.madeForYouTitle"), body: t("features.madeForYouBody") },
  ];

  return (
    <div className="dark nz-login relative flex min-h-screen flex-col overflow-hidden bg-bg text-ink">
      {/* ambient light */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="nz-orb left-[-10%] top-[-12%] h-[520px] w-[520px] bg-primary/25" />
        <div className="nz-orb bottom-[-18%] right-[-8%] h-[460px] w-[460px] bg-sky-400/15" style={{ animationDelay: "-6s" }} />
        <div className="nz-orb left-[35%] top-[45%] h-[300px] w-[300px] bg-amber-400/10" style={{ animationDelay: "-11s" }} />
        <div className="nz-login-grid absolute inset-0" />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <Link href="/" className="nz-liquid-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          {tp("back")}
        </Link>
        <LoginLanguageSwitcher currentLocale={locale} />
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-12">
        {/* brand panel */}
        <section className="order-2 lg:order-1" aria-labelledby="login-headline">
          <div className="hidden items-center gap-3 lg:flex">
            <BrandMark className="h-11 w-11 rounded-2xl text-base shadow-lg shadow-primary/20" />
            <span className="text-xl font-extrabold tracking-tight">{brand.name}</span>
          </div>
          <p className="mt-0 text-xs font-bold uppercase tracking-[0.2em] text-primary lg:mt-10">{tp("eyebrow")}</p>
          <h2 id="login-headline" className="mt-3 max-w-lg text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-[2.6rem]">
            <span className="nz-gradient-text">{tp("headline")}</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">{tp("lead")}</p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {features.map(({ icon: Icon, title, body }) => (
              <li key={title} className="nz-liquid flex items-start gap-3 rounded-2xl p-4">
                <span className="nz-liquid-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="nz-liquid mt-3 flex items-center gap-3.5 overflow-hidden rounded-2xl p-4">
            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-400/20 blur-3xl" />
            <CoinIcon size={40} className="nz-coin-float relative shrink-0" />
            <span className="relative">
              <span className="nz-gradient-gold block text-sm font-extrabold">{tp("perkTitle")}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{tp("perkBody")}</span>
            </span>
          </div>
        </section>

        {/* sign-in card */}
        <section className="order-1 mx-auto w-full max-w-md lg:order-2" aria-labelledby="login-title">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <BrandMark className="h-14 w-14 rounded-2xl text-lg shadow-xl shadow-primary/25" />
            <span className="mt-3 text-lg font-extrabold tracking-tight">{brand.name}</span>
          </div>

          <div className="nz-liquid nz-login-card relative overflow-hidden rounded-[28px] p-6 sm:p-8">
            <div className="text-center">
              <h1 id="login-title" className="text-xl font-extrabold tracking-tight sm:text-2xl">
                {t("welcome.title")}
              </h1>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">{t("welcome.subtitle")}</p>
            </div>
            <div className="mt-6">
              <LoginCodeForm redirectTo={redirectTo} />
            </div>
            <p className="mt-6 flex items-start justify-center gap-1.5 text-center text-[11px] leading-relaxed text-ink-soft">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2} aria-hidden="true" />
              {t("welcome.securityHint")}
            </p>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-soft">
              {t.rich("welcome.consent", {
                link: (chunks) => (
                  <Link href="/privacy" className="font-semibold text-primary underline-offset-2 hover:underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        </section>
      </main>

      <footer className="relative z-10 px-4 pb-6 text-center text-[11px] text-ink-soft" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
        {t("copyright")}
      </footer>
    </div>
  );
}
