import type { MetadataRoute } from "next";
import { getBlogPosts, getBrands, getCategories, searchProducts } from "@/lib/api";
import { getStores } from "@/lib/store-api";
import { getGuides } from "@/lib/guides-api";
import { productPaths, sitemapAlternates, sitemapUrl, type LocalePaths } from "@/lib/seo";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { brandPath, categoryPath, entityPaths } from "@/lib/entity-paths";

type Entry = MetadataRoute.Sitemap[number];

/** One entry per language (/x, /ru/x, /en/x), each listing all three as hreflang alternates. */
function localized(path: LocalePaths, rest: Omit<Entry, "url" | "alternates"> = {}): MetadataRoute.Sitemap {
  const alternates = sitemapAlternates(path);
  return SUPPORTED_LOCALES.map((l) => ({ url: sitemapUrl(path, l), alternates, ...rest }));
}

// Rebuilt at most hourly (never only at build time -- new products must appear without a redeploy).
export const revalidate = 3600;

const MAX_PRODUCT_PAGES = 50; // 100 per page -> up to 5 000 products

async function safely<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback; // the backend being briefly unavailable must never break the sitemap
  }
}

async function productEntries(): Promise<MetadataRoute.Sitemap> {
  const out: MetadataRoute.Sitemap = [];
  for (let page = 1; page <= MAX_PRODUCT_PAGES; page++) {
    const res = await safely(() => searchProducts({ page, pageSize: 100, sort: "-created_at" }), null);
    if (!res) break;
    for (const p of res.data) {
      // the product photo rides along as an image-sitemap entry, so Google Images finds it with its page
      out.push(...localized(productPaths(p), { lastModified: p.created_at ? new Date(p.created_at) : undefined, changeFrequency: "daily", priority: 0.8, ...(p.primary_image_path ? { images: [p.primary_image_path] } : {}) }));
    }
    if (page >= (res.pagination?.total_pages ?? 1)) break;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    ...localized("/", { lastModified: now, changeFrequency: "daily", priority: 1 }),
    ...localized("/products", { lastModified: now, changeFrequency: "daily", priority: 0.9 }),
    ...localized("/stores", { changeFrequency: "weekly", priority: 0.8 }),
    ...localized("/brands", { changeFrequency: "weekly", priority: 0.7 }),
    ...localized("/loyalty", { changeFrequency: "monthly", priority: 0.6 }),
    ...localized("/blog", { changeFrequency: "weekly", priority: 0.6 }),
    ...localized("/guides", { changeFrequency: "weekly", priority: 0.8 }),
    ...localized("/about", { changeFrequency: "monthly", priority: 0.4 }),
    ...localized("/contact", { changeFrequency: "monthly", priority: 0.4 }),
    ...localized("/privacy", { changeFrequency: "yearly", priority: 0.2 }),
    ...localized("/terms", { changeFrequency: "yearly", priority: 0.2 }),
  ];

  const [products, categories, brands, stores, posts, guides] = await Promise.all([
    productEntries(),
    safely(() => getCategories().then((r) => r.data), []),
    safely(() => getBrands().then((r) => r.data), []),
    safely(() => getStores().then((r) => r.results), []),
    safely(() => getBlogPosts(100).then((r) => r.data), []),
    safely(() => getGuides("uz"), []),
  ]);

  return [
    ...staticPages,
    ...products,
    ...categories.flatMap((c) => localized(entityPaths(categoryPath, c), { changeFrequency: "weekly", priority: 0.8 })),
    ...brands.flatMap((b) => localized(entityPaths(brandPath, b), { changeFrequency: "weekly", priority: 0.7 })),
    ...stores.flatMap((s) => localized(`/store/${s.slug}`, { changeFrequency: "weekly", priority: 0.7 })),
    ...guides.flatMap((g) => localized(`/guides/${g.slug}`, { lastModified: new Date(g.updated_at), changeFrequency: "monthly", priority: 0.7 })),
    ...posts.flatMap((p) => localized(`/blog/${p.slug}`, { lastModified: p.published_at ? new Date(p.published_at) : undefined, changeFrequency: "monthly", priority: 0.5 })),
  ];
}
