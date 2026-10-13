import { NextRequest, NextResponse } from "next/server";
import { clientIpFrom } from "@/lib/client-ip";
import { isSafeRedirectPath } from "@/lib/safe-redirect";

/**
 * Two jobs, both UX conveniences (the Django backend stays the only security authority):
 *
 * 1. Silent session refresh. The access cookie lives 15 minutes; the refresh cookie 30 days. When the
 *    access cookie is gone but a refresh cookie is present, exchange it here -- before any page or Route
 *    Handler runs -- and hand the new tokens to both the downstream request and the browser. Without this,
 *    every API call after 15 minutes answered 401 and customers saw "please log in" mid-checkout.
 *    The backend rotates refresh tokens and treats re-use as theft (revoking the session), so concurrent
 *    requests carrying the same refresh token share ONE exchange (in-flight + short-lived result cache).
 * 2. Redirects: protected pages → /login?next=… without a session; /login → `next` with one.
 */
const PROTECTED_PREFIXES = ["/account", "/profile", "/checkout", "/orders"];
const GUEST_ONLY_PREFIXES = ["/login", "/verify-otp"];
const ACCESS_COOKIE = "nz_access_token";
const REFRESH_COOKIE = "nz_refresh_token";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const isProd = process.env.NODE_ENV === "production";

type Tokens = { access_token: string; refresh_token: string };
type Exchange = { tokens: Tokens | null; at: number };

// Keyed by the refresh token being exchanged. Results are kept briefly so requests that were already in
// flight with the old cookie (parallel fetches on one page) reuse the same new pair instead of re-using the old token.
const exchanges = new Map<string, Promise<Exchange>>();
const RESULT_TTL_MS = 30_000;

function exchange(refreshToken: string, ip: string | null): Promise<Exchange> {
  const cached = exchanges.get(refreshToken);
  if (cached) return cached;
  const job = fetch(`${API_BASE_URL}/api/v1/identity/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(ip ? { "X-Forwarded-For": ip } : {}) },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  })
    .then(async (res) => {
      const body = await res.json().catch(() => null);
      const data = body?.data;
      return { tokens: res.ok && data?.access_token && data?.refresh_token ? { access_token: data.access_token, refresh_token: data.refresh_token } : null, at: Date.now() };
    })
    // Network trouble is not a verdict on the session: don't cache it, the next request tries again.
    .catch(() => {
      exchanges.delete(refreshToken);
      return { tokens: null, at: -1 };
    });
  exchanges.set(refreshToken, job);
  job.then((r) => {
    if (r.at < 0) return;
    setTimeout(() => exchanges.delete(refreshToken), RESULT_TTL_MS);
  });
  return job;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  let fresh: Tokens | null = null;
  let dropSession = false;

  if (!req.cookies.has(ACCESS_COOKIE) && refreshToken) {
    const result = await exchange(refreshToken, clientIpFrom(req.headers));
    fresh = result.tokens;
    dropSession = !fresh && result.at >= 0; // the backend refused the refresh token: it's dead
  }

  const hasSession = Boolean(fresh) || (!dropSession && (req.cookies.has(ACCESS_COOKIE) || req.cookies.has(REFRESH_COOKIE)));

  let response: NextResponse;
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    response = NextResponse.redirect(loginUrl);
  } else if (GUEST_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && hasSession && pathname !== "/verify-otp") {
    // An already-signed-in visitor opening /login?next=/checkout goes straight to that (safe) destination.
    const next = req.nextUrl.searchParams.get("next");
    response = NextResponse.redirect(new URL(isSafeRedirectPath(next) ? next : "/", req.url));
  } else if (fresh) {
    // Downstream (page / Route Handler) must see the new access token on THIS request already.
    req.cookies.set(ACCESS_COOKIE, fresh.access_token);
    req.cookies.set(REFRESH_COOKIE, fresh.refresh_token);
    response = NextResponse.next({ request: { headers: req.headers } });
  } else if (dropSession) {
    req.cookies.delete(REFRESH_COOKIE);
    response = NextResponse.next({ request: { headers: req.headers } });
  } else {
    response = NextResponse.next();
  }

  if (fresh) {
    response.cookies.set(ACCESS_COOKIE, fresh.access_token, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 60 * 15 });
    response.cookies.set(REFRESH_COOKIE, fresh.refresh_token, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  } else if (dropSession) {
    response.cookies.delete(REFRESH_COOKIE);
  }
  return response;
}

export const config = {
  // Every page and Route Handler (so the refresh happens wherever the first request after expiry lands), not static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$).*)"],
};
