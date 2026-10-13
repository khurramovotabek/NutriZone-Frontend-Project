import { NextResponse } from "next/server";
import { WishlistApiError, removeFromWishlist } from "@/lib/wishlist-api";
import { getAccessToken } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    await removeFromWishlist(accessToken, productId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof WishlistApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not remove this item." } }, { status: 500 });
  }
}
