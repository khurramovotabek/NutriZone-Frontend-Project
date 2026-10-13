/**
 * Server-only calls to the real NutriZone Cart API.
 *
 * CRITICAL FINDING (see Phase 09.2 report): cart items have NO
 * automatic price resolution. `POST /cart/{code}/items` returns
 * `price_reference: null`. The only endpoint that sets a price
 * (`POST /cart/{code}/snapshot`) requires the caller to supply
 * `unit_amount` directly -- there is no server-side lookup against
 * Pricing. Wiring that from this frontend would mean trusting a
 * client-supplied price, which this phase's own rules explicitly
 * forbid ("never trust client-side price"). That endpoint is
 * therefore deliberately NOT called anywhere in this codebase.
 *
 * SECOND FINDING: Cart.customer_id is never populated from the
 * authenticated user on creation -- ownership is enforced entirely
 * via the opaque `X-Cart-Token` header (confirmed directly: a Bearer
 * token alone returns 403, adding the matching token returns 200).
 * Both `code` and `token` must therefore be persisted together,
 * exactly like the auth tokens in `session.ts`.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface CartItem {
  id: string;
  product_variant_id: string;
  quantity: number;
  status: string;
  price_reference: { price_snapshot_id: string; unit_amount: string; currency: string; applied_at: string } | null;
  reservation_reference: { reservation_id: string; reserved_at: string; expires_at: string | null } | null;
  note: string | null;
}

export interface Cart {
  id: string;
  code: string;
  token: string;
  version: number;
  currency: string;
  cart_type: string;
  status: string;
  customer_id: string | null;
  items: CartItem[];
  coupon_ids: string[];
  is_locked: boolean;
  expires_at: string | null;
}

export interface BackendErrorBody {
  success: false;
  error: { code: string; message: string; category: string; details: Record<string, unknown> };
}

export class CartApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "CartApiError";
  }
}

async function cartFetch<T>(path: string, accessToken: string | null, init: RequestInit & { cartToken?: string } = {}): Promise<T> {
  const { cartToken, ...rest } = init;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(rest.headers as Record<string, string>) };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (cartToken) headers["X-Cart-Token"] = cartToken;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers, cache: "no-store" });

  if (response.status === 204) return null as T;

  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new CartApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as T;
}

export async function createCart(accessToken: string | null): Promise<Cart> {
  /**
   * Real, product-required behavior: a not-logged-in visitor gets
   * a real "guest" cart (cart_type: "guest", customer_id: null) --
   * ownership is enforced entirely by the opaque token returned here,
   * not by the JWT. A logged-in visitor still gets "authenticated"
   * (matching the pre-existing convention) so Cart's own domain
   * distinguishes the two cases if it ever needs to.
   */
  return cartFetch<Cart>("/api/v1/cart/", accessToken, { method: "POST", body: JSON.stringify({ cart_type: accessToken ? "authenticated" : "guest" }) });
}

export async function getCart(accessToken: string | null, code: string, cartToken: string): Promise<Cart> {
  return cartFetch<Cart>(`/api/v1/cart/${code}`, accessToken, { method: "GET", cartToken });
}

export async function addCartItem(accessToken: string | null, code: string, cartToken: string, productVariantId: string, quantity: number): Promise<Cart> {
  return cartFetch<Cart>(`/api/v1/cart/${code}/items`, accessToken, {
    method: "POST",
    cartToken,
    body: JSON.stringify({ product_variant_id: productVariantId, quantity }),
  });
}

export async function updateCartItemQuantity(accessToken: string | null, code: string, cartToken: string, lineId: string, quantity: number): Promise<Cart> {
  return cartFetch<Cart>(`/api/v1/cart/${code}/items/${lineId}`, accessToken, { method: "PATCH", cartToken, body: JSON.stringify({ quantity }) });
}

export async function removeCartItem(accessToken: string | null, code: string, cartToken: string, lineId: string): Promise<null> {
  return cartFetch<null>(`/api/v1/cart/${code}/items/${lineId}`, accessToken, { method: "DELETE", cartToken });
}

/**
 * Real, existing backend capability (`UpdateCartSerializer`, PATCH
 * /cart/{code}/) never previously wired up on the frontend -- the only
 * real "order comment" field: an Order created from this cart carries
 * no comment/note field of its own on `CheckoutCartView.post`
 * (confirmed directly against the checkout view -- cart.note is never
 * read there), so this note lives on the Cart record itself, not the
 * resulting Order. Disclosed as a real backend limitation rather than
 * silently implying it reaches order fulfillment staff via the Order.
 */
export async function updateCartNote(accessToken: string | null, code: string, cartToken: string, note: string | null): Promise<Cart> {
  return cartFetch<Cart>(`/api/v1/cart/${code}`, accessToken, { method: "PATCH", cartToken, body: JSON.stringify({ note }) });
}

export async function clearCart(accessToken: string | null, code: string, cartToken: string): Promise<Cart> {
  return cartFetch<Cart>(`/api/v1/cart/${code}/clear`, accessToken, { method: "POST", cartToken });
}

/**
 * NOTE (investigated, not wired up here): the backend also exposes
 * POST /cart/{code}/merge to fold a guest cart into an authenticated
 * one, gated by permission code `cart.merge.execute`. Confirmed directly
 * against the real seeded "customer" role that it is NOT granted that
 * permission (only cart.item.create/update/view, cart.line_item.manage,
 * cart.price_reference.manage, cart.checkout.execute, cart.validation.execute)
 * -- every real customer gets 403 PERMISSION_DENIED calling it, and
 * granting it would mean editing role/permission data, which is a
 * backend change this task's own rules forbid. Not needed for the
 * actual bug anyway: confirmed separately (direct backend request) that
 * pricing a still-guest-typed cart succeeds fine once the request itself
 * carries a valid access token -- CanAttachPriceSnapshot only checks the
 * actor's role, and cart ownership for a guest cart is enforced via its
 * token, not customer_id. See AddToCartButton.tsx / cart/page.tsx for
 * where that real fix actually lives.
 */

export interface CheckoutPreviewIssue {
  severity: string;
  code: string;
  message: string;
  item_id: string | null;
}

export interface AppliedCoupon {
  code: string;
  amount: string;
}

export interface CheckoutPreview {
  readiness: "ready" | "not_ready" | "blocked";
  issues: CheckoutPreviewIssue[];
  items: CartItem[];
  priced_item_count: number;
  total_item_count: number;
  subtotal: { amount: string; currency: string } | null;
  applied_coupons: AppliedCoupon[];
  discount: { amount: string; currency: string } | null;
  total: { amount: string; currency: string } | null;
  currency: string;
  expires_at: string | null;
  /** Coin payment options for the signed-in customer (null for guests / non-UZS carts). */
  loyalty?: { enabled: boolean; balance: number; max_redeemable: number; max_percent: number; min_coins: number } | null;
}

export async function getCheckoutPreview(accessToken: string, code: string, cartToken: string): Promise<CheckoutPreview> {
  /**
   * Phase 09.5: calls the new, customer-safe Checkout Preview
   * endpoint. Sends no request body at all -- readiness, issues, and
   * subtotal all come from the backend's own CalculateCheckoutReadiness
   * / ValidateCart services plus a display-only sum of already
   * server-priced line items. discount/applied_coupons/total are
   * computed from any real, attached coupon(s) -- omitted (null/empty)
   * when none are attached, never a fabricated non-zero value.
   */
  return cartFetch<CheckoutPreview>(`/api/v1/cart/${code}/checkout-preview`, accessToken, { method: "GET", cartToken });
}

export async function applyCheckoutCoupon(accessToken: string, code: string, cartToken: string, couponCode: string): Promise<{ id: string }> {
  /**
   * Calls the new, checkout-facing coupon endpoint (separate from the
   * pre-existing, staff-only coupon-reference endpoint) -- resolves
   * the real, human-readable code server-side against CouponModel,
   * without repricing any cart item (so CheckoutPreviewView's own
   * discount computation is the single source of truth).
   */
  return cartFetch<{ id: string }>(`/api/v1/cart/${code}/checkout-coupon`, accessToken, {
    method: "POST", cartToken, body: JSON.stringify({ coupon_code: couponCode }),
  });
}

export async function removeCheckoutCoupon(accessToken: string, code: string, cartToken: string, couponCode: string): Promise<{ id: string }> {
  return cartFetch<{ id: string }>(`/api/v1/cart/${code}/checkout-coupon`, accessToken, {
    method: "DELETE", cartToken, body: JSON.stringify({ coupon_code: couponCode }),
  });
}

export interface CheckoutOrderResult {
  id: string;
  order_number: string;
  status: string;
  currency: string;
  line_count: number;
}

export async function submitCheckout(
  accessToken: string,
  code: string,
  cartToken: string,
  shippingAddressId: string,
  idempotencyKey: string,
  billingAddressId?: string,
  coinsToRedeem = 0,
  fulfilment: { method: "delivery" | "pickup"; pickupStoreId?: string } = { method: "delivery" },
): Promise<CheckoutOrderResult> {
  /**
   * Phase 18.3: wires the real, existing backend CheckoutCartView --
   * confirmed via direct source inspection that it accepts NO client
   * price of any kind (every line's unit_price comes from the cart's
   * own already-server-priced items via PriceCartItemView, called
   * earlier by AddToCartForm). Only shipping_address_id (a real,
   * pre-owned geo.Address id) is sent. Same required idempotency-key
   * pattern as priceCartItem -- one key per logical checkout attempt.
   */
  return cartFetch<CheckoutOrderResult>(`/api/v1/cart/${code}/checkout`, accessToken, {
    method: "POST",
    cartToken,
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      // pickup: the branch instead of an address (the backend checks every item is free there)
      ...(fulfilment.method === "pickup" ? { fulfilment_method: "pickup", pickup_store_id: fulfilment.pickupStoreId } : { shipping_address_id: shippingAddressId }),
      ...(billingAddressId ? { billing_address_id: billingAddressId } : {}),
      ...(coinsToRedeem > 0 ? { coins_to_redeem: coinsToRedeem } : {}),
    }),
  });
}
export async function priceCartItem(accessToken: string, code: string, cartToken: string, itemId: string, idempotencyKey: string, couponCode?: string): Promise<Cart> {
  /**
   * Phase 09.4c: wires the real, server-authoritative pricing
   * endpoint added in Phase 09.4/09.4b. This is the ONLY function
   * that resolves a cart item's price -- it sends no monetary field
   * of any kind, only the item to price and an optional coupon code.
   * The backend resolves the active PriceList, calls CalculatePrice,
   * creates a real PriceSnapshot via LockPrice, and attaches it --
   * all server-side. See IssueVariantPriceSnapshotSerializer /
   * PriceItemSerializer on the backend for the exact contract this
   * matches.
   *
   * Phase 09.6: idempotencyKey is now required -- the backend
   * endpoint itself started requiring the real Idempotency-Key
   * header this phase (protect_with_idempotency), reusing this
   * project's own existing, proven idempotency system rather than
   * inventing a new one. The caller (the Route Handler) is
   * responsible for generating one key per logical user action, not
   * a new key per HTTP attempt -- see the Route Handler's own
   * comment for exactly how that's done today.
   */
  return cartFetch<Cart>(`/api/v1/cart/${code}/items/${itemId}/price`, accessToken, {
    method: "POST",
    cartToken,
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(couponCode ? { coupon_code: couponCode } : {}),
  });
}
