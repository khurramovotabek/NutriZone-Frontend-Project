import { clientCookieAttrs } from "@/lib/cookie-policy";
import { LOCALE_COOKIE, splitLocalePath, type Locale } from "./config";

/** Persists the UI locale for a year; the server reads it in i18n/request.ts. Browser-only. */
export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000${clientCookieAttrs()}`;
}

/**
 * Switches the UI language. On a /ru or /en address the prefix itself fixes the language, so the visitor is
 * taken to the plain address (which then follows the new cookie); elsewhere the page just re-renders.
 */
export function switchLocale(locale: Locale, router: { refresh: () => void }) {
  setLocaleCookie(locale);
  // A signed-in customer's choice becomes their profile language -- the bot and notifications follow it (a guest's
  // 401 is simply ignored). Only an explicit switch writes it; visiting a page never does.
  void fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: locale }), keepalive: true }).catch(() => {});
  const { locale: fromPath, path } = splitLocalePath(window.location.pathname);
  // A full load: the client router may hold the plain address prefetched in the old language.
  if (fromPath) window.location.replace(`${path}${window.location.search}${window.location.hash}`);
  else router.refresh();
}
