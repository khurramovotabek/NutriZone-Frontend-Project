import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/** Public catalog pages are crawlable; personal, transactional and auth pages are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/account", "/orders", "/checkout", "/cart", "/profile", "/wishlist", "/login", "/verify-otp", "/auto-login", "/tg", "/r/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
