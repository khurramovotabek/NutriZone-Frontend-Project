import { NextResponse } from "next/server";
import { CartApiError, clearCart as clearCartApi } from "@/lib/cart-api";
import { getAccessToken, getCartCode, getCartToken } from "@/lib/session";

export async function POST() {
  const accessToken = await getAccessToken();
  const code = await getCartCode();
  const token = await getCartToken();
  if (!code || !token) {
    return NextResponse.json({ success: false, error: { code: "NO_CART", message: "No active cart found." } }, { status: 404 });
  }

  try {
    const cart = await clearCartApi(accessToken, code, token);
    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not clear your cart." } }, { status: 500 });
  }
}
