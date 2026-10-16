import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

/** GET -- the signed-in customer's receipts (online orders, shop purchases, manual receipts), newest first. */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/receipts/mine`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body) {
      return NextResponse.json({ success: false, error: body?.error ?? { code: "UNKNOWN", message: "Could not load receipts." } }, { status: res.status || 500 });
    }
    return NextResponse.json({ success: true, data: body.data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load receipts." } }, { status: 500 });
  }
}
