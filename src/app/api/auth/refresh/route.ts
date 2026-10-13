import { NextResponse } from "next/server";
import { AuthApiError, refreshTokens } from "@/lib/auth-api";
import { clearSessionCookies, getRefreshToken, setSessionCookies } from "@/lib/session";

export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "No active session." } }, { status: 401 });
  }

  try {
    const tokens = await refreshTokens(refreshToken);
    await setSessionCookies(tokens);
    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    // Covers TOKEN_REUSE_DETECTED (a rotated token reused) and plain
    // expiry alike -- in either case the session is no longer valid,
    // so clear it here rather than leave stale cookies around.
    await clearSessionCookies();
    if (err instanceof AuthApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Session could not be refreshed." } }, { status: 500 });
  }
}
