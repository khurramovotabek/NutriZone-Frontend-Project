import { NextRequest, NextResponse } from "next/server";
import { AuthApiError, getTelegramAuthSessionStatus } from "@/lib/auth-api";
import { setSessionCookies } from "@/lib/session";
import { applyPendingReferral } from "@/lib/referral-server";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session");
  if (!sessionId) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "session is required." } }, { status: 422 });
  }

  // Real consistency fix: this previously made its own raw fetch()
  // straight to the Django backend (duplicating API_BASE_URL
  // resolution and response-shape parsing) instead of going through
  // lib/auth-api.ts's typed getTelegramAuthSessionStatus -- the exact
  // same call the sibling /api/auth/telegram/session/[sessionId]
  // route already makes for the website-initiated polling flow. Both
  // deep-link paths (bot-initiated here, website-initiated there) now
  // share one source of truth for how a Telegram auth session is
  // read and how its errors are shaped.
  try {
    const result = await getTelegramAuthSessionStatus(sessionId);

    if (result.status !== "verified" || !result.access_token || !result.refresh_token) {
      return NextResponse.json({ success: false, error: { code: "SESSION_NOT_READY", message: `Session status: ${result.status}` } }, { status: 409 });
    }

    await setSessionCookies({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      session_id: sessionId,
      is_new_user: false,
    });
    await applyPendingReferral(result.access_token);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not verify this login link." } }, { status: 500 });
  }
}
