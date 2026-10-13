import { NextResponse } from "next/server";
import { SessionsApiError, getSessions } from "@/lib/sessions-api";
import { getAccessToken } from "@/lib/session";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const sessions = await getSessions(accessToken);
    return NextResponse.json({ success: true, data: sessions });
  } catch (err) {
    if (err instanceof SessionsApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load your sessions." } }, { status: 500 });
  }
}
