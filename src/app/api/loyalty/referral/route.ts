import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

/** POST { code } -- apply a friend's invite code manually (account → Rewards). */
export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase().slice(0, 16) : "";
  if (!code) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Enter an invite code." } }, { status: 422 });
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/loyalty/referral/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ code, channel: "manual" }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { success: false, error: { code: "UNKNOWN", message: "Could not apply the code." } }, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not apply the code." } }, { status: 500 });
  }
}
