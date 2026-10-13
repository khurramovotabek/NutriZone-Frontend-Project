import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BrandProvider } from "@/components/BrandContext";
import { getBrand } from "@/lib/brand";
import { SITE_URL } from "@/lib/site-url";
import TopLoader from "@/components/TopLoader";

export async function generateMetadata(): Promise<Metadata> {
  const [{ name }, t, locale] = await Promise.all([getBrand(), getTranslations("meta"), getLocale()]);
  const title = `${name} — ${t("tagline")}`;
  const description = t("description", { brand: name });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${name}` },
    description,
    applicationName: name,
    // Shared links (Telegram, Instagram, Facebook) render a proper preview card; pages add their own title/image.
    openGraph: { type: "website", siteName: name, title, description, locale: { uz: "uz_UZ", ru: "ru_RU", en: "en_US" }[locale] ?? "uz_UZ" },
    twitter: { card: "summary_large_image", title, description },
    formatDetection: { telephone: false },
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
        <NextIntlClientProvider>
          <BrandProvider brand={brand}>
            <ThemeProvider>{children}</ThemeProvider>
          </BrandProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
