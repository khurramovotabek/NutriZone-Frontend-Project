import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** GET ?ids=a,b&locale=uz -- same-origin proxy for the public variant display lookup, so order/cart screens never depend on backend CORS. */
export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids") ?? "";
  const locale = req.nextUrl.searchParams.get("locale") ?? "";
  if (!ids) return NextResponse.json({ success: true, data: [] });
  try {
    const query = new URLSearchParams({ ids, ...(locale ? { locale } : {}) });
    const response = await fetch(`${API_BASE_URL}/api/v1/products/variants?${query.toString()}`, { next: { revalidate: 300 } });
    const body = await response.json();
    if (!response.ok) {
      return NextResponse.json({ success: false, error: { code: body?.error?.code ?? "UNKNOWN", message: body?.error?.message ?? "Could not load products." } }, { status: response.status });
    }
    return NextResponse.json({ success: true, data: body.data });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load products." } }, { status: 502 });
  }
}
