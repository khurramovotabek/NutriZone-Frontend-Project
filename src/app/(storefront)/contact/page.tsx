import { ArrowRight, BookOpen, Camera, Clock, Mail, MapPin, MessageCircle, Package, Phone, Send, ShoppingBag } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPublicSiteSettings } from "@/lib/settings-api";
import { ErrorState } from "@/components/ui";
import ContactForm from "@/components/ContactForm";
import ContactChannelCard from "@/components/contact/ContactChannelCard";
import ContactSpotlight from "@/components/contact/ContactSpotlight";
import { getBrand } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [tSeo, { name }] = await Promise.all([getTranslations("seo"), getBrand()]);
  return pageMetadata({ path: "/contact", title: tSeo("contactTitle"), description: tSeo("contactDescription", { brand: name }) });
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const tNav = await getTranslations("navigation");

  let settings;
  try {
    const result = await getPublicSiteSettings();
    settings = result.data;
  } catch {
    return <ErrorState message={t("loadError")} />;
  }

  const phone = settings.support_phone?.trim() || null;
  const email = settings.support_email?.trim() || null;
  const address = settings.address?.trim() || null;
  const workingHours = settings.working_hours?.trim() || null;
  const telegram = settings.telegram_username?.trim().replace(/^@/, "") || null;
  const instagram = settings.instagram_url?.trim() || null;
  const telegramChannelUrl = settings.telegram_channel_url || (telegram ? `https://t.me/${telegram}` : null);
  const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;

  const quickActions = [
    phone && { href: `tel:${phone.replace(/\s+/g, "")}`, label: t("quickCall"), icon: Phone, external: false },
    telegram && { href: `https://t.me/${telegram}`, label: t("quickTelegram"), icon: Send, external: true },
    email && { href: `mailto:${email}`, label: t("quickEmail"), icon: Mail, external: false },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Phone; external: boolean }[];

  const helpLinks = [
    { href: "/orders", icon: Package, title: t("help.ordersTitle"), body: t("help.ordersBody") },
    { href: "/products", icon: ShoppingBag, title: t("help.catalogTitle"), body: t("help.catalogBody") },
    { href: "/about", icon: BookOpen, title: t("help.aboutTitle"), body: t("help.aboutBody") },
  ];

  return (
    <ContactSpotlight className="relative isolate overflow-hidden">
      {/* Ambient light behind the glass -- purely decorative. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="nz-orb left-[-8%] top-[-6%] h-[380px] w-[380px] bg-primary/25" />
        <div className="nz-orb right-[-10%] top-[28%] h-[420px] w-[420px] bg-emerald-500/15" style={{ animationDelay: "-6s" }} />
        <div className="nz-orb bottom-[-10%] left-[30%] h-[320px] w-[320px] bg-sky-400/15" style={{ animationDelay: "-12s" }} />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pt-14">
        <nav aria-label="Breadcrumb" className="mb-10 flex items-center gap-1.5 text-xs text-ink-muted">
          <Link href="/" className="transition-colors hover:text-primary">
            {tNav("home")}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-ink">
            {t("title")}
          </span>
        </nav>

        {/* HERO */}
        <header className="nz-rise mx-auto max-w-3xl text-center">
          <span className="nz-liquid inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink-muted">
            <span className="nz-pulse-dot h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            {t("eyebrow")}
          </span>
          <h1 className="nz-gradient-text mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{t("heroTitle")}</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">{t("intro")}</p>

          {quickActions.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {quickActions.map(({ href, label, icon: Icon, external }, i) => (
                <a
                  key={href}
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={
                    i === 0
                      ? "nz-cta nz-shimmer-btn inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
                      : "nz-liquid nz-liquid-tile inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-ink hover:text-primary"
                  }
                >
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  {label}
                </a>
              ))}
            </div>
          )}
        </header>

        {/* CHANNELS + FORM */}
        <div className="mt-14 grid grid-cols-1 gap-6 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-8">
          <section aria-labelledby="contact-channels-title" className="space-y-3">
            <div className="mb-4 px-1">
              <h2 id="contact-channels-title" className="text-lg font-bold tracking-tight text-ink">
                {t("channelsTitle")}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">{t("channelsSubtitle")}</p>
            </div>

            <ContactChannelCard
              icon={<Phone className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />}
              label={t("phone")}
              value={phone ?? t("noPhone")}
              href={phone ? `tel:${phone.replace(/\s+/g, "")}` : null}
              copyValue={phone ?? undefined}
              delayMs={60}
            />
            {email && (
              <ContactChannelCard
                icon={<Mail className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />}
                label={t("email")}
                value={email}
                href={`mailto:${email}`}
                copyValue={email}
                delayMs={120}
              />
            )}
            <ContactChannelCard
              icon={<Send className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />}
              label={t("telegram")}
              value={telegram ? `@${telegram}` : t("noTelegram")}
              href={telegram ? `https://t.me/${telegram}` : null}
              copyValue={telegram ? `@${telegram}` : undefined}
              external
              delayMs={180}
            />
            {instagram && (
              <ContactChannelCard
                icon={<Camera className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />}
                label={t("instagram")}
                value={t("openInstagram")}
                href={instagram}
                external
                delayMs={240}
              />
            )}

            {(address || workingHours) && (
              <div className="nz-liquid nz-rise overflow-hidden rounded-2xl" style={{ animationDelay: "300ms" }}>
                <div className="grid divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  {address && (
                    <div className="p-5">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                        <MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={2} aria-hidden="true" />
                        {t("location")}
                      </div>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-ink">{address}</p>
                      {mapsUrl && (
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                          {t("openMaps")}
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  )}
                  {workingHours && (
                    <div className="p-5">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                        <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={2} aria-hidden="true" />
                        {t("workingHours")}
                      </div>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-ink">{workingHours}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {telegramChannelUrl && (
              <a
                href={telegramChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="nz-liquid nz-liquid-tile nz-rise group flex items-center gap-4 rounded-2xl p-4 sm:p-5"
                style={{ animationDelay: "360ms" }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-sky-500/30">
                  <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t("openTelegram")}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{t("telegramChannelHint")}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-1 group-hover:text-primary" strokeWidth={2} aria-hidden="true" />
              </a>
            )}
          </section>

          <ContactForm />
        </div>

        {/* SELF-SERVICE */}
        <section aria-labelledby="contact-help-title" className="mt-16">
          <h2 id="contact-help-title" className="text-center text-lg font-bold tracking-tight text-ink">
            {t("help.title")}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {helpLinks.map(({ href, icon: Icon, title, body }) => (
              <Link key={href} href={href} className="nz-liquid nz-liquid-tile group rounded-2xl p-5">
                <div className="nz-liquid-icon flex h-10 w-10 items-center justify-center rounded-xl">
                  <Icon className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-ink group-hover:text-primary">
                  {title}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" strokeWidth={2} aria-hidden="true" />
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{body}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </ContactSpotlight>
  );
}
