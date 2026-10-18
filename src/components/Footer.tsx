import Link from "next/link";
import { Clock, FileSignature, Mail, MapPin, Phone, Send, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import BrandMark from "@/components/BrandMark";
import { getBrand } from "@/lib/brand";
import { getAccessToken, getRefreshToken } from "@/lib/session";
import { getPublicSiteSettings, type PublicSiteSettings } from "@/lib/settings-api";

const PAYMENT_LOGOS = ["payme", "click", "uzum", "uzcard", "humo", "cash"] as const;

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

async function siteSettings(): Promise<PublicSiteSettings | null> {
  try {
    const res = await getPublicSiteSettings();
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

export default async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("navigation");
  const tBlog = await getTranslations("blog");
  const year = new Date().getFullYear();
  const [brand, site] = await Promise.all([getBrand(), siteSettings()]);
  const signedIn = Boolean((await getAccessToken()) ?? (await getRefreshToken()));
  const phone = site?.support_phone?.trim();
  const email = site?.support_email?.trim();
  const telegram = site?.telegram_username?.trim().replace(/^@/, "");
  const link = "text-ink-muted transition-colors hover:text-primary";
  const social = "flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink-muted ring-1 ring-border transition hover:-translate-y-0.5 hover:text-primary";

  return (
    <footer className="nz-glass nz-site-footer">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
              <BrandMark className="h-7 w-7 rounded-lg text-xs" />
              {brand.name}
            </p>
            <p className="mt-3 max-w-xs text-sm text-ink-muted">{t("tagline")}</p>
            <div className="mt-5 flex gap-2">
              {site?.telegram_channel_url && (
                <a href={site.telegram_channel_url} target="_blank" rel="noopener noreferrer" aria-label={t("telegramChannel")} className={social}>
                  <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </a>
              )}
              {site?.instagram_url && (
                <a href={site.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={social}>
                  <InstagramIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">{t("shopHeading")}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/products" className={link}>{tNav("catalog")}</Link></li>
              <li><Link href="/brands" className={link}>{t("brands")}</Link></li>
              <li><Link href="/stores" className={link}>{t("stores")}</Link></li>
              <li><Link href="/loyalty" className={link}>{t("loyaltyProgram")}</Link></li>
              <li><Link href="/blog" className={link}>{tBlog("title")}</Link></li>
              <li><Link href="/about" className={link}>{tNav("about")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">{t("accountHeading")}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/account" className={link}>{t("myAccount")}</Link></li>
              <li><Link href="/orders" className={link}>{tNav("orders")}</Link></li>
              <li>
                {/* signed-in shoppers get their wallet here instead of a pointless "Log in" */}
                <Link href={signedIn ? "/account/loyalty" : "/login"} className={link}>
                  {signedIn ? tNav("loyalty") : tNav("login")}
                </Link>
              </li>
              <li><Link href="/account/product-requests" className={link}>{t("findProduct")}</Link></li>
              <li><Link href="/contact" className={link}>{tNav("contact")}</Link></li>
              <li><Link href="/terms" className={link}>{t("terms")}</Link></li>
              <li><Link href="/privacy" className={link}>{t("privacy")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">{t("contactHeading")}</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              {phone && (
                <li>
                  <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={`inline-flex items-center gap-2 ${link}`}>
                    <Phone className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} aria-hidden="true" />
                    {phone}
                  </a>
                </li>
              )}
              {telegram && (
                <li>
                  <a href={`https://t.me/${telegram}`} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 ${link}`}>
                    <Send className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} aria-hidden="true" />@{telegram}
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className={`inline-flex items-center gap-2 break-all ${link}`}>
                    <Mail className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} aria-hidden="true" />
                    {email}
                  </a>
                </li>
              )}
              {site?.address && (
                <li className="flex items-start gap-2 text-ink-muted">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} aria-hidden="true" />
                  <span>{site.address}</span>
                </li>
              )}
              {site?.working_hours && (
                <li className="flex items-center gap-2 text-ink-muted">
                  <Clock className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} aria-hidden="true" />
                  {t("hours", { hours: site.working_hours })}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2" aria-label={t("paymentMethods")}>
            {PAYMENT_LOGOS.map((key) => (
              // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG badges
              <img key={key} src={`/payments/${key}.svg`} alt={key} className="h-7 w-11 rounded-md shadow-sm" loading="lazy" />
            ))}
          </div>
          <div className="flex flex-col items-start gap-1 text-sm text-ink-soft sm:items-end">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/terms" className="inline-flex items-center gap-1.5 transition-colors hover:text-primary">
                <FileSignature className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                {t("terms")}
              </Link>
              <Link href="/privacy" className="inline-flex items-center gap-1.5 transition-colors hover:text-primary">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                {t("privacy")}
              </Link>
            </div>
            <span>
              © {year} {brand.name}. {t("rights")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
