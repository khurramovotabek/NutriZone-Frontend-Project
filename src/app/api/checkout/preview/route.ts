import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { CartApiError, getCart, getCheckoutPreview, priceCartItem } from "@/lib/cart-api";
import { getAccessToken, getCartCode, getCartToken } from "@/lib/session";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in to view checkout." } }, { status: 401 });
  }
  const code = await getCartCode();
  const token = await getCartToken();
  if (!code || !token) {
    return NextResponse.json({ success: false, error: { code: "NO_CART", message: "No active cart found." } }, { status: 404 });
  }

  try {
    // Guest-to-checkout handoff: a shopper may fill their cart while signed
    // out (guest cart -- adding needs no login), but the backend can only
    // price a line for a signed-in customer. Now that this request carries
    // a real session, price every still-unpriced line server-side before
    // asking for readiness, so signing in at checkout "just works" instead
    // of bouncing the shopper back to the cart. Per-line failures (e.g. no
    // active price configured) are left for the preview's own issues list.
    await priceUnpricedLines(accessToken, code, token);
    const preview = await getCheckoutPreview(accessToken, code, token);
    return NextResponse.json({ success: true, data: preview });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load checkout preview." } }, { status: 500 });
  }
}

async function priceUnpricedLines(accessToken: string, code: string, token: string) {
  const cart = await getCart(accessToken, code, token).catch(() => null);
  if (!cart) return;
  const unpriced = cart.items.filter((i) => i.status !== "removed" && i.price_reference === null);
  // Sequential on purpose: each call bumps the cart's version.
  for (const item of unpriced) {
    await priceCartItem(accessToken, code, token, item.id, randomUUID()).catch(() => null);
  }
}
