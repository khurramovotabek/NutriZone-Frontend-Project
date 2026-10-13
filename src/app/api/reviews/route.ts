import { NextRequest, NextResponse } from "next/server";
import { ReviewsApiError, createReview, getProductReviews } from "@/lib/reviews-api";
import { getAccessToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in to view reviews." } }, { status: 401 });
  }
  const productId = req.nextUrl.searchParams.get("product_id");
  if (!productId) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "product_id is required." } }, { status: 422 });
  }
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  try {
    const result = await getProductReviews(accessToken, productId, page);
    return NextResponse.json({ success: true, data: result.items, pagination: { total_count: result.totalCount } });
  } catch (err) {
    if (err instanceof ReviewsApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load reviews." } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in to write a review." } }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const productId = body?.product_id;
  const rating = Number(body?.rating);
  const reviewBody = body?.body;
  const title = body?.title;
  if (typeof productId !== "string" || !productId || !Number.isInteger(rating) || rating < 1 || rating > 5 || typeof reviewBody !== "string" || !reviewBody.trim()) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "A valid product, 1-5 star rating, and review text are required." } }, { status: 422 });
  }
  try {
    const review = await createReview(accessToken, productId, rating, reviewBody, typeof title === "string" && title.trim() ? title : undefined);
    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (err) {
    if (err instanceof ReviewsApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not submit your review." } }, { status: 500 });
  }
}
