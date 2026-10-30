import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BrandProvider } from "@/components/BrandContext";
import { getBrand, getSearchVerification } from "@/lib/brand";
import { SITE_URL } from "@/lib/site-url";
import { DEFAULT_OG_IMAGE, OG_LOCALE } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import TopLoader from "@/components/TopLoader";
import { PublicMessages } from "@/i18n/ClientMessages";

export async function generateMetadata(): Promise<Metadata> {
  const [{ name }, t, locale, codes] = await Promise.all([getBrand(), getTranslations("seo"), getLocale(), getSearchVerification()]);
  const title = t("homeTitle", { brand: name });
  const description = t("homeDescription");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${name}` },
    description,
    keywords: t("keywords", { brand: name }).split(",").map((k) => k.trim()).filter(Boolean),
    applicationName: name,
    authors: [{ name, url: SITE_URL }],
    creator: name,
    publisher: name,
    category: "shopping",
    // Shared links (Telegram, Instagram, Facebook) render a proper preview card; pages add their own title/image.
    openGraph: { type: "website", siteName: name, title, description, locale: OG_LOCALE[locale as Locale] ?? "uz_UZ", images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE] },
    formatDetection: { telephone: false },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    // Dashboard → Sozlamalar → Qidiruv tizimlari: Google Search Console / Yandex Webmaster / Bing ownership tags.
    verification: {
      ...(codes.google ? { google: codes.google } : {}),
      ...(codes.yandex ? { yandex: codes.yandex } : {}),
      ...(codes.bing ? { other: { "msvalidate.01": codes.bing } } : {}),
    },
  };
}

/**
 * Minimal root layout -- only the <html>/<body> shell and app-wide
 * providers (locale, theme). Deliberately renders NO navbar, NO
 * footer, NO navigation chrome: those belong to (storefront)/layout.tsx,
 * applied only to the ecommerce route group. /login, /verify-otp, and
 * /auto-login sit outside that group specifically so they inherit
 * only this bare shell -- a standalone authentication experience per
 * explicit product requirement.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const brand = await getBrand();

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col text-ink">
        <TopLoader />
        <PublicMessages>
          <BrandProvider brand={brand}>
            <ThemeProvider>{children}</ThemeProvider>
          </BrandProvider>
        </PublicMessages>
      </body>
    </html>
  );
}
