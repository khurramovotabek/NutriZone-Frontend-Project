import type { MetadataRoute } from "next";
import { DEFAULT_BRAND_NAME, getBrand } from "@/lib/brand";
import { getLocale, getTranslations } from "next-intl/server";
import { SITE_URL } from "@/lib/site-url";

/**
 * Web app manifest -- what makes the site installable straight from the browser (no Play Market / App Store):
 * Android / desktop Chrome, Edge, Samsung Internet and Yandex show "Install app" from it, iPhone uses it with the
 * apple-* tags from the root layout. Icons are the brand mark on black (public/pwa, made from the Dashboard logo):
 * "any" for launchers that show the icon as is, "maskable" with the mark inside the 80 % safe zone for Android's
 * round / squircle masks. Screenshots give Android its richer install sheet. Shortcuts = long-press menu on the icon.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [{ name, shortName }, t, tNav, tPwa, locale] = await Promise.all([getBrand(), getTranslations("seo"), getTranslations("navigation"), getTranslations("pwa"), getLocale()]);
  // "nutrizone" / "NUTRIZONE" in Settings -> the brand's own spelling under the home-screen icon
  const appName = !shortName || shortName.toLowerCase() === DEFAULT_BRAND_NAME.toLowerCase() ? DEFAULT_BRAND_NAME : shortName;
  const shortcutIcon = [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }];
  return {
    id: "/",
    name: `${appName} — ${tPwa("appTagline")}`,
    short_name: appName,
    description: t("homeDescription"),
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#060907",
    lang: locale,
    dir: "ltr",
    categories: ["shopping", "health", "sports", "food"],
    prefer_related_applications: false,
    // lets Chrome's getInstalledRelatedApps() tell the site the app is already on this phone (no install nudge then)
    related_applications: [{ platform: "webapp", url: `${SITE_URL}/manifest.webmanifest` }],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      { src: "/pwa/screens/home.jpg", sizes: "780x1688", type: "image/jpeg", form_factor: "narrow", label: tPwa("perkFast") },
      { src: "/pwa/screens/catalog.jpg", sizes: "780x1688", type: "image/jpeg", form_factor: "narrow", label: tNav("catalog") },
      { src: "/pwa/screens/product.jpg", sizes: "780x1688", type: "image/jpeg", form_factor: "narrow", label: tPwa("perkFull") },
      { src: "/pwa/screens/wide.jpg", sizes: "1600x900", type: "image/jpeg", form_factor: "wide", label: t("homeTitle", { brand: name }) },
    ],
    shortcuts: [
      { name: tNav("catalog"), short_name: tNav("catalog"), url: "/products?source=pwa-shortcut", icons: shortcutIcon },
      { name: tNav("sale"), short_name: tNav("sale"), url: "/products?sale=1&source=pwa-shortcut", icons: shortcutIcon },
      { name: tNav("orders"), short_name: tNav("orders"), url: "/orders?source=pwa-shortcut", icons: shortcutIcon },
      { name: tNav("cart"), short_name: tNav("cart"), url: "/cart?source=pwa-shortcut", icons: shortcutIcon },
    ],
  };
}
