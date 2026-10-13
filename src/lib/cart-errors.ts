/**
 * Client-safe (no server-only imports, unlike cart-api.ts) shared
 * classification for "this cart action failed specifically because the
 * caller isn't signed in" -- matches the Next.js route handlers' own
 * `NO_SESSION` (no access-token cookie at all) plus the real backend's
 * two shapes for a genuinely unauthenticated/unauthorized request
 * (`AUTHENTICATION_REQUIRED`, `PERMISSION_DENIED`, from
 * common/exceptions/handlers.py's DRF exception mapping). Pricing a cart
 * item is the one real case this matters for today: the backend's own
 * `CanAttachPriceSnapshot` permission (apps/cart/interfaces/api/v1/
 * permissions.py) has no `allow_anonymous`, unlike every guest-cart-item
 * permission beside it -- a guest's cart item is added just fine, but
 * pricing it genuinely requires a signed-in customer. Shared here so
 * AddToCartButton, AddToCartForm, and the Cart page all recognize this
 * exact, real outcome the same way instead of three divergent checks.
 */
export const CART_AUTH_REQUIRED_CODES = new Set(["NO_SESSION", "AUTHENTICATION_REQUIRED", "PERMISSION_DENIED"]);

export function cartActionNeedsLogin(errorCode: unknown): boolean {
  return typeof errorCode === "string" && CART_AUTH_REQUIRED_CODES.has(errorCode);
}
