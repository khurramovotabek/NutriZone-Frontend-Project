import { NextResponse } from "next/server";
import { SessionsApiError, logoutAllSessions } from "@/lib/sessions-api";
import { getAccessToken } from "@/lib/session";

export async function POST() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    await logoutAllSessions(accessToken);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof SessionsApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not log out of all devices." } }, { status: 500 });
  }
}
