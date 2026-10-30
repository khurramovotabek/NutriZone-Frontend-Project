import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";

/**
 * Readable addresses for categories and brands: /categories/protein instead of /categories/<uuid>.
 * The API sends `slug` (the request's language) and `slugs` (every language); before that it sent only
 * the id, so every helper falls back to it and old UUID links keep resolving (they 308 to the slug).
 */
export interface Sluggable {
  id: string;
  slug?: string;
  slugs?: Partial<Record<string, string>>;
}

export function entitySlug(e: Sluggable, locale?: string): string {
  return (locale && e.slugs?.[locale]) || e.slug || e.id;
}

export const categoryPath = (c: Sluggable, locale?: string) => `/categories/${entitySlug(c, locale)}`;
export const brandPath = (b: Sluggable, locale?: string) => `/brands/${entitySlug(b, locale)}`;

/** The unprefixed path of `e` in every language (for canonical/hreflang and the sitemap). */
export function entityPaths(path: (e: Sluggable, locale?: string) => string, e: Sluggable): Partial<Record<Locale, string>> {
  const out: Partial<Record<Locale, string>> = {};
  for (const l of SUPPORTED_LOCALES) out[l] = path(e, l);
  return out;
}

/** Does a URL segment name this entity -- by id or by its slug in any language? */
export function matchesParam(e: Sluggable, param: string): boolean {
  const p = decodeURIComponent(param);
  return e.id === p || e.slug === p || Object.values(e.slugs ?? {}).includes(p);
}
