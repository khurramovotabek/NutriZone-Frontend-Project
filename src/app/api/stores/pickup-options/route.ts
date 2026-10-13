import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** GET /api/stores/pickup-options?items=<variant>:<qty>,...&lat=&lng= → branches ranked for this cart (public). */
export async function GET(req: NextRequest) {
  const items = (req.nextUrl.searchParams.get("items") ?? "").slice(0, 2500);
  if (!/^[0-9a-f-]{36}:\d{1,3}(,[0-9a-f-]{36}:\d{1,3})*$/i.test(items)) return NextResponse.json({ success: true, data: [] });
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  const near = Number.isFinite(lat) && Number.isFinite(lng) && req.nextUrl.searchParams.get("lat") ? `&lat=${lat}&lng=${lng}` : "";
  const res = await fetch(`${API_BASE_URL}/api/v1/stores/pickup-options?items=${items}${near}`, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ success: false, error: { code: body?.error?.code ?? "UNKNOWN", message: "Could not load stores." } }, { status: res.status });
  return NextResponse.json({ success: true, data: body.data });
}
