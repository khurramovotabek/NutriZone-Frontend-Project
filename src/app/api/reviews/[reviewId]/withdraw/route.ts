import { NextResponse } from "next/server";
import { ReviewsApiError, withdrawReview } from "@/lib/reviews-api";
import { getAccessToken } from "@/lib/session";

export async function POST(_req: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in to delete your review." } }, { status: 401 });
  }
  try {
    const review = await withdrawReview(accessToken, reviewId);
    return NextResponse.json({ success: true, data: review });
  } catch (err) {
    if (err instanceof ReviewsApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not delete your review." } }, { status: 500 });
  }
}
