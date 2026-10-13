import { NextRequest, NextResponse } from "next/server";
import { getMyReviews, ReviewsApiError } from "@/lib/reviews-api";
import { getAccessToken } from "@/lib/session";

/**
 * Real, existing capability (`CustomerReviewListView`), filtered here
 * by `product_id` (a request the real endpoint itself doesn't support
 * -- it's customer-scoped only) so the product page can answer "does
 * the current visitor already have a review on THIS product" without
 * a second, product-scoped concept.
 */
export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  const productId = req.nextUrl.searchParams.get("product_id");

  try {
    const { items } = await getMyReviews(accessToken);
    const filtered = productId ? items.filter((r) => r.product_id === productId) : items;
    return NextResponse.json({ success: true, data: filtered });
  } catch (err) {
    if (err instanceof ReviewsApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load your reviews." } }, { status: 500 });
  }
}
