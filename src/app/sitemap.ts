import type { MetadataRoute } from "next";
import { getBlogPosts, getBrands, getCategories, searchProducts } from "@/lib/api";
import { getStores } from "@/lib/store-api";
import { absoluteUrl } from "@/lib/site-url";

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
      out.push({ url: absoluteUrl(`/products/${p.slug}`), lastModified: p.created_at ? new Date(p.created_at) : undefined, changeFrequency: "daily", priority: 0.8 });
    }
    if (page >= (res.pagination?.total_pages ?? 1)) break;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/products"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/brands"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/stores"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/loyalty"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.3 },
  ];

  const [products, categories, brands, stores, posts] = await Promise.all([
    productEntries(),
    safely(() => getCategories().then((r) => r.data), []),
    safely(() => getBrands().then((r) => r.data), []),
    safely(() => getStores().then((r) => r.results), []),
    safely(() => getBlogPosts(100).then((r) => r.data), []),
  ]);

  return [
    ...staticPages,
    ...products,
    ...categories.map((c) => ({ url: absoluteUrl(`/categories/${c.id}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...brands.map((b) => ({ url: absoluteUrl(`/brands/${b.id}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...stores.map((s) => ({ url: absoluteUrl(`/store/${s.slug}`), changeFrequency: "weekly" as const, priority: 0.5 })),
    ...posts.map((p) => ({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: p.published_at ? new Date(p.published_at) : undefined, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
