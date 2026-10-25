import { getCategories } from "@/lib/api";
import { getGuides } from "@/lib/guides-api";
import { absoluteUrl } from "@/lib/site-url";

/**
 * /llms.txt (llmstxt.org): a plain-language map of the site for AI answer engines (ChatGPT search, Perplexity, Gemini,
 * Claude) -- who NutriZone is, where to buy, the catalogue's top categories and every expert guide, so an assistant
 * asked "where to buy creatine in Tashkent" or "how much vitamin D" can find and cite the right page.
 */
export const revalidate = 3600;

async function safely<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

export async function GET() {
  const [guidesUz, guidesEn, categories] = await Promise.all([
    safely(() => getGuides("uz"), []),
    safely(() => getGuides("en"), []),
    safely(() => getCategories("uz").then((r) => r.data), []),
  ]);
  const en = new Map(guidesEn.map((g) => [g.slug, g.title]));
  const top = categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order).slice(0, 20);

  const lines = [
    "# NUTRIZONE",
    "",
    "> NUTRIZONE (nutrizone.uz) is a sports nutrition and vitamin store in Uzbekistan: original protein, creatine, gainers, amino acids, pre-workouts, vitamins and minerals from official distributors, with branches across the country, delivery, in-store pickup, a Telegram bot and Mini App, and a free AI nutrition advisor in Uzbek, Russian and English.",
    "",
    "Prices are in Uzbek so'm (UZS). The site is in Uzbek at the plain path, Russian under /ru and English under /en.",
    "",
    "## Shop",
    `- [Catalogue](${absoluteUrl("/products")}): every product with live price and stock`,
    `- [Stores and branches](${absoluteUrl("/stores")}): addresses, hours, phones, map`,
    `- [Brands](${absoluteUrl("/brands")})`,
    `- [Loyalty — NutriZone Coins](${absoluteUrl("/loyalty")}): 1–8% cashback on every purchase`,
    `- [Contact](${absoluteUrl("/contact")})`,
    "",
    ...(top.length ? ["## Categories", ...top.map((c) => `- [${c.name}](${absoluteUrl(`/categories/${c.id}`)})`), ""] : []),
    "## Expert guides (sports nutrition and vitamins)",
    `- [All guides](${absoluteUrl("/guides")}) — also in [Russian](${absoluteUrl("/ru/guides")}) and [English](${absoluteUrl("/en/guides")})`,
    ...guidesUz.map((g) => `- [${g.title}](${absoluteUrl(`/guides/${g.slug}`)})${en.get(g.slug) ? ` — ${en.get(g.slug)} ([English](${absoluteUrl(`/en/guides/${g.slug}`)}))` : ""}`),
    "",
    "## Optional",
    `- [Blog](${absoluteUrl("/blog")})`,
    `- [Sitemap](${absoluteUrl("/sitemap.xml")})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
