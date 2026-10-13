import { NextRequest, NextResponse } from "next/server";
import { AuthApiError, getTelegramAuthSessionStatus } from "@/lib/auth-api";
import { setSessionCookies } from "@/lib/session";
import { applyPendingReferral } from "@/lib/referral-server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  try {
    const result = await getTelegramAuthSessionStatus(sessionId);

    if (result.status === "verified" && result.access_token && result.refresh_token) {
      // Matches the existing /api/auth/verify-otp route's own
      // convention exactly: tokens live only in HttpOnly cookies,
      // never in the JSON response body sent to client JS.
      await setSessionCookies({ access_token: result.access_token, refresh_token: result.refresh_token, session_id: sessionId, is_new_user: false });
      await applyPendingReferral(result.access_token);
      return NextResponse.json({ success: true, data: { status: "verified" } });
    }

    return NextResponse.json({ success: true, data: { status: result.status } });
  } catch (err) {
    if (err instanceof AuthApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Something went wrong. Please try again." } }, { status: 500 });
  }
}
