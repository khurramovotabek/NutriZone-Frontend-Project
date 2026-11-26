import type { Metadata, Viewport } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BrandProvider } from "@/components/BrandContext";
import { getBrand, getSearchVerification } from "@/lib/brand";
import { SITE_URL } from "@/lib/site-url";
import { FOUNDER } from "@/lib/founder";
import { DEFAULT_OG_IMAGE, OG_LOCALE } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import TopLoader from "@/components/TopLoader";
import VisitBeacon from "@/components/VisitBeacon";
import { PublicMessages } from "@/i18n/ClientMessages";
import PwaRuntime from "@/components/pwa/PwaRuntime";
import { PWA_BOOT_SCRIPT } from "@/lib/pwa";

/** iPhone / iPad launch screens (public/pwa/splash, portrait, device px) -> the CSS media query each one matches. */
const IOS_SPLASH: [number, number, number][] = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3], [414, 896, 3],
  [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2], [1024, 1366, 2], [834, 1194, 2], [820, 1180, 2], [810, 1080, 2], [744, 1133, 2],
];

/**
 * viewport-fit=cover: the installed app (and Safari with a collapsed toolbar) draws edge to edge, so the many
 * env(safe-area-inset-*) paddings already in the layout (header, bottom bars, sheets) actually apply on iPhones --
 * without it iOS reports every inset as 0. theme-color follows the colour scheme (PwaRuntime keeps it in sync with
 * the site's own light/dark switch, which can differ from the phone's).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7faf8" },
    { media: "(prefers-color-scheme: dark)", color: "#060907" },
  ],
};

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
    authors: [{ name, url: SITE_URL }, { name: FOUNDER.name, url: FOUNDER.url }],
    creator: `${FOUNDER.name} (${FOUNDER.site})`,
    publisher: name,
    category: "shopping",
    // Shared links (Telegram, Instagram, Facebook) render a proper preview card; pages add their own title/image.
    openGraph: { type: "website", siteName: name, title, description, locale: OG_LOCALE[locale as Locale] ?? "uz_UZ", images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE] },
    formatDetection: { telephone: false },
    // Installed on an iPhone home screen ("Add to Home Screen"): full screen, brand launch screen, short name.
    appleWebApp: {
      capable: true,
      title: "NutriZone",
      statusBarStyle: "black-translucent",
      startupImage: IOS_SPLASH.map(([w, h, dpr]) => ({
        url: `/pwa/splash/${w * dpr}x${h * dpr}.jpg`,
        media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
      })),
    },
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
        {/* before hydration: marks the installed app (<html data-standalone>) and keeps the browser's install prompt */}
        <script dangerouslySetInnerHTML={{ __html: PWA_BOOT_SCRIPT }} />
        <TopLoader />
        <VisitBeacon />
        <PublicMessages>
          <BrandProvider brand={brand}>
            <ThemeProvider>
              {children}
              <PwaRuntime />
            </ThemeProvider>
          </BrandProvider>
        </PublicMessages>
      </body>
    </html>
  );
}
