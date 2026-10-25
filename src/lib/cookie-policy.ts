/**
 * Cookie attributes for the session, cart and language cookies -- first-party "Lax" on the website, but
 * "None; Secure; Partitioned" (CHIPS) when the storefront runs as the Telegram Mini App inside an iframe
 * (Telegram Web / web.telegram.org). Chrome drops Lax cookies set in a cross-site iframe, so there every
 * request started a new empty cart and the sign-in from /tg never stuck ("savatga qo'shdim, savat bo'sh").
 * Partitioned cookies live only under the embedding site's partition, so other sites can't make the browser
 * send them -- the same CSRF protection Lax gives on the website.
 *
 * The page marks itself as embedded with the readable `nz_embed` cookie (markEmbedded(), set by the /tg entry and
 * the Mini App bridge before anything else), and every Route Handler / the proxy reads it to pick the attributes.
 * The Telegram mobile apps open the Mini App top-level (no iframe), so they keep plain Lax cookies.
 */
export const EMBED_COOKIE = "nz_embed";

const isProd = process.env.NODE_ENV === "production";

export type CookieAttrs = { sameSite: "lax" | "none"; secure: boolean; partitioned?: boolean };

export function cookieAttrs(embedded: boolean): CookieAttrs {
  return embedded && isProd ? { sameSite: "none", secure: true, partitioned: true } : { sameSite: "lax", secure: isProd };
}

/** Browser side: `; SameSite=...` suffix for a cookie written from JS (language choice). */
export function clientCookieAttrs(): string {
  return isEmbeddedFrame() && window.location.protocol === "https:" ? "; SameSite=None; Secure; Partitioned" : "; SameSite=Lax";
}

/** Browser side: true when this page runs inside another site's iframe (Telegram Web). */
export function isEmbeddedFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true; // a cross-origin parent throws on access -- that's exactly the embedded case
  }
}

/** Browser side: tells the server this tab is the embedded Mini App, so its cookies get the partitioned attributes. */
export function markEmbedded(): void {
  if (!isEmbeddedFrame() || window.location.protocol !== "https:") return;
  if (document.cookie.split("; ").some((c) => c === `${EMBED_COOKIE}=1`)) return;
  document.cookie = `${EMBED_COOKIE}=1; path=/; max-age=31536000; SameSite=None; Secure; Partitioned`;
}
