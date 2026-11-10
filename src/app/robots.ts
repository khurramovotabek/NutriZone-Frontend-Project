import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { PREFIXED_LOCALES } from "@/i18n/config";

const PRIVATE = ["/account", "/orders", "/checkout", "/cart", "/profile", "/wishlist", "/login", "/verify-otp", "/auto-login", "/tg", "/r/", "/compare"];

const AI_BOTS = ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "Perplexity-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "Google-Extended", "Applebot-Extended"];

/** Public catalog pages are crawlable in every language; personal, transactional and auth pages are not. */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", ...PRIVATE, ...PREFIXED_LOCALES.flatMap((l) => PRIVATE.map((p) => `/${l}${p}`)), "/*?*sort=", "/*?*q="];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // AI answer engines (ChatGPT search, Perplexity, Claude, Gemini, Apple, Copilot) are welcome on the public catalog:
      // being crawlable is what lets them cite and recommend the store. A named group replaces "*" for that bot, so it
      // repeats the same private paths.
      { userAgent: AI_BOTS, allow: ["/", "/llms.txt"], disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
