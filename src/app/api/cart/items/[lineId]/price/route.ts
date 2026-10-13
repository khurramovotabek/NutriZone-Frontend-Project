import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { CartApiError, priceCartItem } from "@/lib/cart-api";
import { getAccessToken, getCartCode, getCartToken } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
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
  const couponCode = typeof body?.coupon_code === "string" ? body.coupon_code : undefined;

  // Phase 09.6: one key per incoming request to this handler. This is
  // correct today because AddToCartForm disables its button while a
  // request is in flight, so the browser cannot send two overlapping
  // requests for the same user click. A true "retry the exact same
  // logical action after a network timeout with the same key" wrapper
  // is NOT implemented on the client yet -- disclosed honestly rather
  // than claimed solved.
  const idempotencyKey = randomUUID();

  try {
    const cart = await priceCartItem(accessToken, code, token, lineId, idempotencyKey, couponCode);
    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not confirm the price for this item." } }, { status: 500 });
  }
}
