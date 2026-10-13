import { NextResponse } from "next/server";
import { AccountApiError, getCustomerProfile } from "@/lib/account-api";
import { getAccessToken } from "@/lib/session";

/** Proxies `GET /api/v1/chat/conversations/{id}/customer-profile` -- the store-manager-only customer profile popover (InquiriesWorkspace). 403s straight through for a customer calling this on their own conversation. */
export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const profile = await getCustomerProfile(accessToken, conversationId);
    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    if (err instanceof AccountApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load this customer's profile." } }, { status: 500 });
  }
}
