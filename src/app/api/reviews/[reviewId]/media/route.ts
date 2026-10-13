import { NextRequest, NextResponse } from "next/server";
import { ReviewsApiError, attachReviewMediaFile } from "@/lib/reviews-api";
import { getAccessToken } from "@/lib/session";

const ALLOWED_MEDIA_TYPES = new Set(["image", "video"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in to attach media." } }, { status: 401 });
  }

  const incoming = await req.formData().catch(() => null);
  const mediaType = incoming?.get("media_type");
  const file = incoming?.get("file_upload");
  if (typeof mediaType !== "string" || !ALLOWED_MEDIA_TYPES.has(mediaType) || !(file instanceof File)) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "A media type and file are required." } }, { status: 422 });
  }

  const forward = new FormData();
  forward.set("media_type", mediaType);
  forward.set("file_upload", file, file.name);

  try {
    const review = await attachReviewMediaFile(accessToken, reviewId, forward);
    return NextResponse.json({ success: true, data: review });
  } catch (err) {
    if (err instanceof ReviewsApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not attach your media." } }, { status: 500 });
  }
}
