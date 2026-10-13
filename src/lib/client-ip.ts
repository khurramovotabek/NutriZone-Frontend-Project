/**
 * The shopper's real IP for server-to-server calls to Django.
 *
 * Auth endpoints are rate-limited per IP (login 20/h, refresh 30/h). Our
 * Route Handlers call the backend from the Next server, so without this
 * every customer looked like the same address and the limits became
 * site-wide: the 21st sign-in of the hour failed for everyone. Prefer the
 * header our edge sets (Cloudflare, then nginx) over the client-supplied
 * X-Forwarded-For chain.
 */
export function clientIpFrom(headers: Headers): string | null {
  const ip = headers.get("cf-connecting-ip") ?? headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

/**
 * `{ "X-Forwarded-For": ip, "X-Client-User-Agent": ua }` for the current request (empty outside a request scope).
 * The user agent lets the dashboard show which browser / device a login session belongs to -- without it every
 * session read "node" (this server), not the shopper's browser.
 */
export async function forwardedForHeader(): Promise<Record<string, string>> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const ip = clientIpFrom(h);
    const ua = h.get("user-agent")?.slice(0, 500);
    return { ...(ip ? { "X-Forwarded-For": ip } : {}), ...(ua ? { "X-Client-User-Agent": ua } : {}) };
  } catch {
    return {};
  }
}
