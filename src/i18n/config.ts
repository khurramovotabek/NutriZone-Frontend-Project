export const SUPPORTED_LOCALES = ["en", "ru", "uz"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "uz";
export const LOCALE_COOKIE = "nz_locale";

/**
 * Every public page has one address per language so search engines can index all three: Uzbek (the
 * default) at the plain path, Russian and English under a prefix -- /products, /ru/products, /en/products.
 * src/proxy.ts strips the prefix and passes the language on in this request header (it wins over the cookie).
 */
export const LOCALE_HEADER = "x-nz-locale";
export const PREFIXED_LOCALES: readonly Locale[] = ["ru", "en"];

/** "/ru/products/x" → { locale: "ru", path: "/products/x" }; an unprefixed path has no locale of its own. */
export function splitLocalePath(pathname: string): { locale: Locale | null; path: string } {
  for (const l of PREFIXED_LOCALES) {
    if (pathname === `/${l}` || pathname.startsWith(`/${l}/`)) return { locale: l, path: pathname.slice(l.length + 1) || "/" };
  }
  return { locale: null, path: pathname };
}

/** The address of `path` in `locale`: "/products" → "/ru/products"; Uzbek keeps the plain path. */
export function localizedPath(path: string, locale: Locale): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}
