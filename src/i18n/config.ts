export const SUPPORTED_LOCALES = ["en", "ru", "uz"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "uz";
export const LOCALE_COOKIE = "nz_locale";
