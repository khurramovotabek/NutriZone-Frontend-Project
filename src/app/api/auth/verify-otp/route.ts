import { NextRequest, NextResponse } from "next/server";
import { AuthApiError, verifyOtp } from "@/lib/auth-api";
import { setSessionCookies } from "@/lib/session";
import { applyPendingReferral } from "@/lib/referral-server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phoneNumber = body?.phone_number;
  const code = body?.code;
  if (typeof phoneNumber !== "string" || !phoneNumber || typeof code !== "string" || !code) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Phone number and code are required." } }, { status: 422 });
  }

  try {
    const tokens = await verifyOtp(phoneNumber, code);
    await setSessionCookies(tokens);
    await applyPendingReferral(tokens.access_token);
    // Deliberately does NOT return access_token/refresh_token in the
    // response body -- they live only in the HttpOnly cookies just
    // set. Only the safe, non-sensitive is_new_user flag is returned
    // for the client to use (e.g. a "Welcome!" message).
    return NextResponse.json({ success: true, data: { is_new_user: tokens.is_new_user } });
  } catch (err) {
    if (err instanceof AuthApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Something went wrong. Please try again." } }, { status: 500 });
  }
}
