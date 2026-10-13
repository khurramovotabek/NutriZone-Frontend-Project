import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { CartApiError, getCart, priceCartItem, submitCheckout } from "@/lib/cart-api";
import { getAccessToken, getCartCode, getCartToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  const code = await getCartCode();
  const token = await getCartToken();
  if (!code || !token) {
    return NextResponse.json({ success: false, error: { code: "NO_CART", message: "No active cart found." } }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const pickup = body?.fulfilmentMethod === "pickup";
  const pickupStoreId = typeof body?.pickupStoreId === "string" && /^[0-9a-f-]{36}$/i.test(body.pickupStoreId) ? body.pickupStoreId : undefined;
  const shippingAddressId = typeof body?.shippingAddressId === "string" ? body.shippingAddressId : "";
  if (pickup ? !pickupStoreId : !shippingAddressId) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: pickup ? "Choose the store to pick up from." : "A shipping address is required." } }, { status: 422 });
  }
  const fulfilment = pickup ? { method: "pickup" as const, pickupStoreId } : { method: "delivery" as const };

  // One key per incoming request to this handler -- the checkout page
  // disables its submit button while a request is in flight, matching
  // the same documented limitation already disclosed in price/route.ts
  // (a true retry-with-same-key wrapper across network timeouts is not
  // implemented on the client yet).
  const idempotencyKey = randomUUID();
  const coinsToRedeem = Number.isInteger(body?.coinsToRedeem) && body.coinsToRedeem > 0 ? body.coinsToRedeem : 0;

  try {
    let order;
    try {
      order = await submitCheckout(accessToken, code, token, shippingAddressId, idempotencyKey, undefined, coinsToRedeem, fulfilment);
    } catch (err) {
      // Prices are locked for a short while when items are added. A cart left open longer has expired locks:
      // re-lock every line at today's price (server-side, authoritative) and place the order once more.
      if (!(err instanceof CartApiError) || err.code !== "PRICE_SNAPSHOT_EXPIRED") throw err;
      const cart = await getCart(accessToken, code, token);
      for (const item of cart.items.filter((i) => i.status !== "removed")) {
        await priceCartItem(accessToken, code, token, item.id, randomUUID());
      }
      order = await submitCheckout(accessToken, code, token, shippingAddressId, randomUUID(), undefined, coinsToRedeem, fulfilment);
    }
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not complete checkout." } }, { status: 500 });
  }
}
