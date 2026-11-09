/**
 * `{ "X-Internal-Token": ... }` for this server's own calls to Django, `{}` in the browser or when unset.
 *
 * Every server-side fetch reaches Django from one address, so the backend's global per-IP tier (100/min) used to
 * be shared by all shoppers together: 4 867 answers of 429 in the week to 2026-11-09 (catalogue pages, the brand
 * settings, the sitemap cut off at 1 000 products). With this token Django skips that tier for us
 * (core.ratelimit.throttles.is_trusted_server); endpoint limits such as login or OTP still apply.
 *
 * Only for cached, public reads made by this server. A request relayed for one shopper and not cached forwards the
 * shopper's IP instead (forwardedForHeader in client-ip.ts) so the per-shopper limit keeps working.
 * INTERNAL_API_TOKEN has no NEXT_PUBLIC_ prefix, so it is never put into a browser bundle.
 */
export function internalTokenHeader(): Record<string, string> {
  if (typeof window !== "undefined") return {};
  const token = process.env.INTERNAL_API_TOKEN;
  return token ? { "X-Internal-Token": token } : {};
}
