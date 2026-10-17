import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { PREFIXED_LOCALES } from "@/i18n/config";

const PRIVATE = ["/account", "/orders", "/checkout", "/cart", "/profile", "/wishlist", "/login", "/verify-otp", "/auto-login", "/tg", "/r/", "/compare"];

/** Public catalog pages are crawlable in every language; personal, transactional and auth pages are not. */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", ...PRIVATE, ...PREFIXED_LOCALES.flatMap((l) => PRIVATE.map((p) => `/${l}${p}`)), "/*?*sort=", "/*?*q="];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
