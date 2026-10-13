import { NextRequest, NextResponse } from "next/server";
import { AccountApiError, uploadConversationAttachment } from "@/lib/account-api";
import { getAccessToken } from "@/lib/session";

/** Multipart passthrough -- same shape as /api/my-store/media. Returns the uploaded attachment's real, resolved URL for the caller to then POST as a message. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const formData = await req.formData();
    const attachment = await uploadConversationAttachment(accessToken, conversationId, formData);
    return NextResponse.json({ success: true, data: attachment }, { status: 201 });
  } catch (err) {
    if (err instanceof AccountApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not upload this file." } }, { status: 500 });
  }
}
