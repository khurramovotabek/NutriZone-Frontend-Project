import { NextResponse } from "next/server";
import { AccountApiError, issueWsTicket } from "@/lib/account-api";
import { getAccessToken } from "@/lib/session";

/**
 * Reads the real access token server-side (HttpOnly, never exposed to
 * client JS) and exchanges it for a short-lived (60s), single-purpose
 * WebSocket ticket -- the only credential the browser ever attaches to
 * a `wss://.../ws/chat/{id}/?token=` handshake.
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const result = await issueWsTicket(accessToken);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof AccountApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not open a realtime connection." } }, { status: 500 });
  }
}
