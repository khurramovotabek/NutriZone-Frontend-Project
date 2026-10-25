/**
 * Server-side session cookie helpers. Tokens live only in HttpOnly
 * cookies, set exclusively by Route Handlers (never readable from
 * client JS) -- this is the frontend's answer to "the backend
 * returns tokens in JSON, not cookies" (confirmed by direct
 * reconnaissance): the Next.js layer bridges that into a secure
 * cookie architecture rather than falling back to localStorage.
 */
import { cookies } from "next/headers";
import type { TokenPair } from "./auth-api";
import { EMBED_COOKIE, cookieAttrs } from "./cookie-policy";
import { API_BASE_URL } from "./api";
import { LOCALE_COOKIE, SUPPORTED_LOCALES, type Locale } from "@/i18n/config";

const ACCESS_COOKIE = "nz_access_token";
const REFRESH_COOKIE = "nz_refresh_token";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

/** Lax on the website, partitioned inside the Telegram Web Mini App iframe (see cookie-policy.ts). */
function attrs(store: CookieStore) {
  return cookieAttrs(store.get(EMBED_COOKIE)?.value === "1");
}

/** Expires a cookie with the same attributes it was set with (a partitioned cookie is only removed by a partitioned delete). */
function expire(store: CookieStore, name: string) {
  store.set(name, "", { httpOnly: true, ...attrs(store), path: "/", maxAge: 0 });
}

export async function setSessionCookies(tokens: TokenPair) {
  const store = await cookies();
  // Access token lifetime confirmed by decoding the real JWT captured
  // during reconnaissance: exp - iat = exactly 900 seconds.
  store.set(ACCESS_COOKIE, tokens.access_token, { httpOnly: true, ...attrs(store), path: "/", maxAge: 60 * 15 });
  // Refresh token lifetime confirmed the same way: exp - iat = exactly 30 days.
  store.set(REFRESH_COOKIE, tokens.refresh_token, { httpOnly: true, ...attrs(store), path: "/", maxAge: 60 * 60 * 24 * 30 });
  await adoptProfileLanguage(store, tokens.access_token);
}

/**
 * Signing in switches the site to the language the customer chose (when registering in the bot, or later with a
 * language switcher) -- the profile is the one source of truth, so the bot, the Mini App, notifications and the site
 * always speak the same language. Best effort: a failed lookup keeps the current language.
 */
async function adoptProfileLanguage(store: CookieStore, accessToken: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/identity/users/me`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const language = (await res.json().catch(() => null))?.data?.language as Locale | undefined;
    if (res.ok && language && SUPPORTED_LOCALES.includes(language)) {
      store.set(LOCALE_COOKIE, language, { ...attrs(store), path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
  } catch {
    // keep the current language
  }
}

export async function clearSessionCookies() {
  const store = await cookies();
  expire(store, ACCESS_COOKIE);
  expire(store, REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

const CART_CODE_COOKIE = "nz_cart_code";
const CART_TOKEN_COOKIE = "nz_cart_token";

export async function setCartCookies(code: string, token: string) {
  const store = await cookies();
  // Cart token is itself a security-sensitive credential (confirmed:
  // it's the sole cart-ownership mechanism today -- customer_id is
  // never populated on creation, see cart-api.ts's own module
  // docstring) -- stored HttpOnly for the same reason as auth tokens.
  store.set(CART_CODE_COOKIE, code, { httpOnly: true, ...attrs(store), path: "/", maxAge: 60 * 60 * 24 * 30 });
  store.set(CART_TOKEN_COOKIE, token, { httpOnly: true, ...attrs(store), path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function getCartCode(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_CODE_COOKIE)?.value ?? null;
}

export async function getCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_TOKEN_COOKIE)?.value ?? null;
}
