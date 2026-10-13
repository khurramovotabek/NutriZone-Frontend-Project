import { NextResponse } from "next/server";
import { AuthApiError, getMe, refreshTokens } from "@/lib/auth-api";
import { clearSessionCookies, getAccessToken, getRefreshToken, setSessionCookies } from "@/lib/session";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Not authenticated." } }, { status: 401 });
  }

  try {
    const user = await getMe(accessToken);
    return NextResponse.json({ success: true, data: user });
  } catch (err) {
    if (err instanceof AuthApiError && err.status === 401) {
      // Access token expired -- attempt exactly one refresh-and-retry,
      // per this phase's own explicit requirement.
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const newTokens = await refreshTokens(refreshToken);
          await setSessionCookies(newTokens);
          const user = await getMe(newTokens.access_token);
          return NextResponse.json({ success: true, data: user });
        } catch {
          await clearSessionCookies();
          return NextResponse.json({ success: false, error: { code: "SESSION_EXPIRED", message: "Session expired. Please log in again." } }, { status: 401 });
        }
      }
      await clearSessionCookies();
    }
    if (err instanceof AuthApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Something went wrong." } }, { status: 500 });
  }
}
