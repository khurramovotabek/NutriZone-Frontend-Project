import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const UUID = /^[0-9a-f-]{36}$/i;

/** POST -- cancel one of my open product requests. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  if (!UUID.test(id)) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Not found." } }, { status: 404 });
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/product-requests/${id}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      return NextResponse.json({ success: false, error: body?.error ?? { code: "UNKNOWN", message: "Could not cancel." } }, { status: res.status || 500 });
    }
    return NextResponse.json({ success: true, data: body.data });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not cancel." } }, { status: 500 });
  }
}
