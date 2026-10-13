import { NextRequest, NextResponse } from "next/server";
import { CartApiError, addCartItem, createCart, getCart, updateCartNote } from "@/lib/cart-api";
import { getAccessToken, getCartCode, getCartToken, setCartCookies } from "@/lib/session";

// Merging a guest cart into an authenticated one is handled once, at the
// actual login moment (see mergeGuestCartOnLogin in cart-merge.ts, called
// from every session-creating route: verify-code, verify-otp, auto-login),
// never reactively here. `GET /api/cart` is hit concurrently by more than
// one component on the same page load (CartBadge + the Cart page itself)
// -- a side effect that mutates carts on every read would race itself.
async function ensureCart(accessToken: string | null) {
  const existingCode = await getCartCode();
  const existingToken = await getCartToken();
  if (existingCode && existingToken) {
    try {
      return await getCart(accessToken, existingCode, existingToken);
    } catch {
      // Stale/expired cart reference -- fall through to create a new one.
    }
  }
  const cart = await createCart(accessToken);
  await setCartCookies(cart.code, cart.token);
  return cart;
}

export async function GET() {
  const accessToken = await getAccessToken();
  try {
    const cart = await ensureCart(accessToken);
    // `meta.authenticated` lets the client tell a guest cart (can add/edit
    // freely, but pricing + checkout need sign-in) from a signed-in one
    // without a second /api/auth/me round-trip.
    return NextResponse.json({ success: true, data: cart, meta: { authenticated: Boolean(accessToken) } });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load your cart." } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken();
  const body = await req.json().catch(() => null);
  const productVariantId = body?.product_variant_id;
  const quantity = Number(body?.quantity ?? 1);
  if (typeof productVariantId !== "string" || !productVariantId || !Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "A valid product and quantity are required." } }, { status: 422 });
  }

  try {
    const cart = await ensureCart(accessToken);
    const updated = await addCartItem(accessToken, cart.code, cart.token, productVariantId, quantity);
    return NextResponse.json({ success: true, data: updated, meta: { authenticated: Boolean(accessToken) } }, { status: 201 });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not add this item to your cart." } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const accessToken = await getAccessToken();
  const code = await getCartCode();
  const token = await getCartToken();
  if (!code || !token) {
    return NextResponse.json({ success: false, error: { code: "NO_CART", message: "No active cart found." } }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const note = typeof body?.note === "string" ? body.note : null;

  try {
    const cart = await updateCartNote(accessToken, code, token, note);
    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not save your note." } }, { status: 500 });
  }
}
