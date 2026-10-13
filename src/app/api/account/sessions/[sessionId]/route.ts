import { NextResponse } from "next/server";
import { SessionsApiError, revokeSession } from "@/lib/sessions-api";
import { getAccessToken } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    await revokeSession(accessToken, sessionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof SessionsApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not revoke this session." } }, { status: 500 });
  }
}
