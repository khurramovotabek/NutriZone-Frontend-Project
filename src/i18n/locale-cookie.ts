import { LOCALE_COOKIE, type Locale } from "./config";

/** Persists the UI locale for a year; the server reads it in i18n/request.ts. Browser-only. */
export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}
