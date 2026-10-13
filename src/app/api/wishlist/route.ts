import { NextRequest, NextResponse } from "next/server";
import { WishlistApiError, addToWishlist, getWishlist } from "@/lib/wishlist-api";
import { getAccessToken } from "@/lib/session";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in to view your wishlist." } }, { status: 401 });
  }
  try {
    const items = await getWishlist(accessToken);
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    if (err instanceof WishlistApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load your wishlist." } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in to save items." } }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const productId = body?.product_id;
  if (typeof productId !== "string" || !productId) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "product_id is required." } }, { status: 422 });
  }
  try {
    await addToWishlist(accessToken, productId);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    if (err instanceof WishlistApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not save this item." } }, { status: 500 });
  }
}
