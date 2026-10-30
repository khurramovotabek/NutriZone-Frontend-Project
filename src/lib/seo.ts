import type { Metadata } from "next";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_HEADER, SUPPORTED_LOCALES, localizedPath, type Locale } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site-url";
import { getBrand } from "@/lib/brand";

/**
 * Search-engine plumbing shared by every public page: one URL per language (src/i18n/config.ts), the
 * canonical + hreflang alternates that tie them together, and Open Graph tags that point at the same URL.
 */

/** The generated brand card (src/app/og-image/route.tsx) for pages without their own photo. */
export const DEFAULT_OG_IMAGE = "/og-image";

export const OG_LOCALE: Record<Locale, string> = { uz: "uz_UZ", ru: "ru_RU", en: "en_US" };

/** A page's unprefixed path per language: the same path everywhere, or a per-language map
 *  (a product has its own slug in each language -- /products/…-kapsula, /ru/products/…-kapsul). */
export type LocalePaths = string | Partial<Record<Locale, string>>;

function pathFor(paths: LocalePaths, l: Locale): string {
  if (typeof paths === "string") return paths;
  return paths[l] ?? paths[DEFAULT_LOCALE] ?? Object.values(paths).find(Boolean) ?? "/";
}

/** Per-language product paths from the API's `slugs` map (falls back to the one slug the response has). */
export function productPaths(product: { slug: string; slugs?: Partial<Record<string, string>> }): LocalePaths {
  const out: Partial<Record<Locale, string>> = {};
  for (const l of SUPPORTED_LOCALES) out[l] = `/products/${product.slugs?.[l] || product.slugs?.[DEFAULT_LOCALE] || product.slug}`;
  return out;
}

/** canonical = this page in the current language; alternates = the same page in every language (+ x-default = Uzbek). */
export function languageAlternates(paths: LocalePaths, locale: Locale): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of SUPPORTED_LOCALES) languages[l] = localizedPath(pathFor(paths, l), l);
  languages["x-default"] = localizedPath(pathFor(paths, DEFAULT_LOCALE), DEFAULT_LOCALE);
  return { canonical: localizedPath(pathFor(paths, locale), locale), languages };
}

/** Absolute alternates for the sitemap (`<xhtml:link rel="alternate" hreflang=…>`). */
export function sitemapAlternates(paths: LocalePaths): { languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const l of SUPPORTED_LOCALES) languages[l] = absoluteUrl(localizedPath(pathFor(paths, l), l));
  languages["x-default"] = absoluteUrl(localizedPath(pathFor(paths, DEFAULT_LOCALE), DEFAULT_LOCALE));
  return { languages };
}

/** Page 2+ of a listing is its own page for search engines: canonical to itself (not to page 1, which would
 *  hide every product past the first page) and a distinct title. */
export function paged(paths: LocalePaths, page: number): LocalePaths {
  if (page <= 1) return paths;
  if (typeof paths === "string") return `${paths}?page=${page}`;
  return Object.fromEntries(Object.entries(paths).map(([l, p]) => [l, `${p}?page=${page}`]));
}

/** `path` keeping this request's language prefix (/ru/… stays /ru/…) -- the target of a page's own redirect. */
export async function samePrefixPath(path: string): Promise<string> {
  const l = (await headers()).get(LOCALE_HEADER) as Locale | null;
  return l && (SUPPORTED_LOCALES as readonly string[]).includes(l) ? localizedPath(path, l) : path;
}

/** The sitemap URL of one language version. */
export function sitemapUrl(paths: LocalePaths, l: Locale): string {
  return absoluteUrl(localizedPath(pathFor(paths, l), l));
}

interface PageSeo {
  path: LocalePaths;
  title?: string | Metadata["title"];
  description?: string | null;
  image?: string | null;
  imageAlt?: string;
  keywords?: string[];
  noindex?: boolean;
  type?: "website" | "article";
}

/** Metadata for an indexable page: title/description, canonical + hreflang, Open Graph and Twitter card. */
export async function pageMetadata({ path, title, description, image, imageAlt, keywords, noindex, type = "website" }: PageSeo): Promise<Metadata> {
  const [locale, { name: siteName }] = await Promise.all([getLocale() as Promise<Locale>, getBrand()]);
  const url = localizedPath(pathFor(path, locale), locale);
  const desc = description ? clip(description, 300) : undefined;
  const ogTitle = typeof title === "string" ? title : title && typeof title === "object" && "absolute" in title ? String(title.absolute) : undefined;
  const ogImage = image || DEFAULT_OG_IMAGE;
  return {
    ...(title ? { title } : {}),
    ...(desc ? { description: clip(desc, 170) } : {}),
    ...(keywords?.length ? { keywords } : {}),
    alternates: languageAlternates(path, locale),
    openGraph: {
      type,
      url,
      siteName,
      locale: OG_LOCALE[locale],
      alternateLocale: SUPPORTED_LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(desc ? { description: clip(desc, 200) } : {}),
      images: [{ url: ogImage, alt: imageAlt ?? ogTitle ?? "", ...(image ? {} : { width: 1200, height: 630 }) }],
    },
    twitter: { card: "summary_large_image", ...(ogTitle ? { title: ogTitle } : {}), ...(desc ? { description: clip(desc, 200) } : {}), images: [ogImage] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Plain text of at most `max` characters, cut at a word boundary (meta descriptions, JSON-LD). */
export function clip(text: string, max: number): string {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.6)).replace(/[\s,.;:–—-]+$/, "")}…`;
}

/** schema.org BreadcrumbList from (name, path) pairs -- Google shows it instead of the raw URL. */
export function breadcrumbJsonLd(items: { name: string; path: string }[], locale: Locale): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(localizedPath(it.path, locale)) })),
  };
}
