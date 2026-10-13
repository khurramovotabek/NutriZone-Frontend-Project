import { NextResponse } from "next/server";
import { AccountApiError, openStoreConversation } from "@/lib/account-api";
import { getAccessToken } from "@/lib/session";

/** "Message store" -- opens (or resumes) a conversation with this store's real owner, seated automatically. */
export async function POST(_req: Request, { params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const conversation = await openStoreConversation(accessToken, storeId);
    return NextResponse.json({ success: true, data: conversation }, { status: 201 });
  } catch (err) {
    if (err instanceof AccountApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not start a conversation with this store." } }, { status: 500 });
  }
}
