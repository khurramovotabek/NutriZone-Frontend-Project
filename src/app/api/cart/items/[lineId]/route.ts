import { NextRequest, NextResponse } from "next/server";
import { CartApiError, getCart, removeCartItem, updateCartItemQuantity } from "@/lib/cart-api";
import { getAccessToken, getCartCode, getCartToken } from "@/lib/session";

async function requireCartRef() {
  const code = await getCartCode();
  const token = await getCartToken();
  if (!code || !token) throw new CartApiError(404, "NO_CART", "No active cart found.");
  return { code, token };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  const accessToken = await getAccessToken();
  const body = await req.json().catch(() => null);
  const quantity = Number(body?.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Quantity must be a positive whole number." } }, { status: 422 });
  }

  try {
    const { code, token } = await requireCartRef();
    const cart = await updateCartItemQuantity(accessToken, code, token, lineId, quantity);
    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not update quantity." } }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  const accessToken = await getAccessToken();

  try {
    const { code, token } = await requireCartRef();
    await removeCartItem(accessToken, code, token, lineId);
    const cart = await getCart(accessToken, code, token);
    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not remove this item." } }, { status: 500 });
  }
}
