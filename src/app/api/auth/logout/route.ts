import { NextResponse } from "next/server";
import { logout as backendLogout } from "@/lib/auth-api";
import { clearSessionCookies, getAccessToken, getRefreshToken } from "@/lib/session";

export async function POST() {
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();

  if (accessToken) {
    try {
      await backendLogout(accessToken, refreshToken);
    } catch {
      // Even if the backend call fails (e.g. token already expired),
      // still clear local cookies below -- the client must never be
      // left in a state where it believes it's logged in but the
      // server disagrees.
    }
  }

  await clearSessionCookies();
  return NextResponse.json({ success: true, data: null });
}
