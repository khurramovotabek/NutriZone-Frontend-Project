import { NextRequest, NextResponse } from "next/server";
import { applyCheckoutCoupon, CartApiError, removeCheckoutCoupon } from "@/lib/cart-api";
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
  const couponCode = typeof body?.couponCode === "string" ? body.couponCode.trim() : "";
  if (!couponCode) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "A coupon code is required." } }, { status: 422 });
  }

  try {
    const result = await applyCheckoutCoupon(accessToken, code, token, couponCode);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not apply coupon." } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
  const couponCode = typeof body?.couponCode === "string" ? body.couponCode.trim() : "";
  if (!couponCode) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "A coupon code is required." } }, { status: 422 });
  }

  try {
    const result = await removeCheckoutCoupon(accessToken, code, token, couponCode);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not remove coupon." } }, { status: 500 });
  }
}
