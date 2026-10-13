/**
 * Validates a `next` redirect target so it can only ever point to a
 * relative, internal path -- never an external site. Fixes a real
 * gap found while auditing the existing /verify-otp page, which
 * already read and used a `?next=` param but never validated it
 * before calling router.push().
 *
 * Rejects:
 * - protocol-relative URLs ("//evil.com") -- the browser treats
 *   these as external even though they don't start with "http"
 * - absolute URLs with any scheme ("https://...", "javascript:...")
 * - anything not starting with exactly one "/"
 *
 * Allows:
 * - "/checkout", "/products/foo?x=1", "/orders" -- any relative
 *   internal path, with or without query string/hash
 */
export function isSafeRedirectPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  // A backslash is treated as a forward slash by some browsers,
  // which would otherwise let "/\evil.com" behave like "//evil.com".
  if (value.startsWith("/\\")) return false;
  return true;
}

/** Returns the given `next` value if it's a safe internal path, otherwise the provided fallback (defaults to "/"). */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  return isSafeRedirectPath(value) ? value : fallback;
}
