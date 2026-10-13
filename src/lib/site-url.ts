/**
 * The storefront's public origin (no trailing slash) for absolute URLs: sitemap, robots, canonical / Open Graph
 * links and JSON-LD. Set NEXT_PUBLIC_SITE_URL to the real domain (e.g. https://nutrizone.uz) in production.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
