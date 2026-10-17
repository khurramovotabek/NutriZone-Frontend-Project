import { LOCALE_COOKIE, splitLocalePath, type Locale } from "./config";

/** Persists the UI locale for a year; the server reads it in i18n/request.ts. Browser-only. */
export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * Switches the UI language. On a /ru or /en address the prefix itself fixes the language, so the visitor is
 * taken to the plain address (which then follows the new cookie); elsewhere the page just re-renders.
 */
export function switchLocale(locale: Locale, router: { refresh: () => void }) {
  setLocaleCookie(locale);
  const { locale: fromPath, path } = splitLocalePath(window.location.pathname);
  // A full load: the client router may hold the plain address prefetched in the old language.
  if (fromPath) window.location.replace(`${path}${window.location.search}${window.location.hash}`);
  else router.refresh();
}
