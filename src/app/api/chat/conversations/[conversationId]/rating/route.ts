import { NextResponse } from "next/server";
import { forwardedForHeader } from "@/lib/client-ip";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** `POST /api/chat/conversations/{id}/rating` {score, comment?} → the backend's rating endpoint (the customer rates a closed support chat). */
export async function POST(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  const payload = await req.json().catch(() => ({}));
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(await forwardedForHeader()) },
      body: JSON.stringify({ score: Number(payload?.score) || 0, comment: String(payload?.comment ?? "").slice(0, 500) }),
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    return NextResponse.json(body ?? { success: false, error: { code: "UNKNOWN", message: "Could not rate." } }, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "NETWORK", message: "Could not rate." } }, { status: 502 });
  }
}
