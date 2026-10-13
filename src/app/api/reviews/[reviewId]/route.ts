import { NextRequest, NextResponse } from "next/server";
import { editReview, ReviewsApiError } from "@/lib/reviews-api";
import { getAccessToken } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in to edit your review." } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.body === "string" ? body.body : "";
  if (!text.trim()) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Review text is required." } }, { status: 422 });
  }

  try {
    const review = await editReview(accessToken, reviewId, text, typeof body?.title === "string" ? body.title : undefined);
    return NextResponse.json({ success: true, data: review });
  } catch (err) {
    if (err instanceof ReviewsApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not save your changes." } }, { status: 500 });
  }
}
