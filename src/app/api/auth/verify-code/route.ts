import { NextRequest, NextResponse } from "next/server";
import { AuthApiError, verifyCodeOnly } from "@/lib/auth-api";
import { setSessionCookies } from "@/lib/session";
import { applyPendingReferral } from "@/lib/referral-server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = body?.code;
  if (typeof code !== "string" || !code) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "A 6-digit code is required." } }, { status: 422 });
  }

  try {
    const tokens = await verifyCodeOnly(code);
    await setSessionCookies(tokens);
    await applyPendingReferral(tokens.access_token);
    // Deliberately does NOT return access_token/refresh_token in the
    // response body -- they live only in the HttpOnly cookies just
    // set, matching verify-otp/route.ts's own established pattern.
    return NextResponse.json({ success: true, data: { is_new_user: tokens.is_new_user } });
  } catch (err) {
    if (err instanceof AuthApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Something went wrong. Please try again." } }, { status: 500 });
  }
}
