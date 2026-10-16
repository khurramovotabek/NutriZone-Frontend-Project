import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** GET /api/my-store/receipts?days=1|7|30&q= → the branch's receipts + today's totals (owner and cashiers). */
export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  const raw = req.nextUrl.searchParams.get("days") ?? "7";
  const days = ["1", "7", "30"].includes(raw) ? raw : "7";
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 40);
  const res = await fetch(`${API_BASE_URL}/api/v1/my-store/receipts?days=${days}&q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ success: false, error: { code: body?.error?.code ?? "UNKNOWN", message: body?.error?.message ?? "Could not load receipts." } }, { status: res.status });
  return NextResponse.json({ success: true, data: body.data });
}
