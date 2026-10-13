import { NextResponse } from "next/server";
import { AccountApiError, getConversationDetail } from "@/lib/account-api";
import { getAccessToken } from "@/lib/session";

/**
 * New proxy route: `GET /api/v1/chat/conversations/{id}` was already a
 * real, working backend endpoint (participants list, needed to know
 * who else -- if anyone -- is in a conversation), but nothing in this
 * frontend called it yet. The list endpoint deliberately stays
 * lightweight (no participants), matching the backend's own
 * card-vs-detail split.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const conversation = await getConversationDetail(accessToken, conversationId);
    return NextResponse.json({ success: true, data: conversation });
  } catch (err) {
    if (err instanceof AccountApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load this conversation." } }, { status: 500 });
  }
}
