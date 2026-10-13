import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** GET /api/my-store/report?days=7|30|90 → the owner's branch performance next to the network's (owner only). */
export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  const raw = req.nextUrl.searchParams.get("days") ?? "30";
  const days = ["7", "30", "90"].includes(raw) ? raw : "30";
  const res = await fetch(`${API_BASE_URL}/api/v1/my-store/report?days=${days}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ success: false, error: { code: body?.error?.code ?? "UNKNOWN", message: body?.error?.message ?? "Could not load the report." } }, { status: res.status });
  return NextResponse.json({ success: true, data: body.data });
}
