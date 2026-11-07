import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** GET /api/delivery/options → delivery prices set on the dashboard (Tashkent city up to …, regions from …, pickup free). Public. */
export async function GET() {
  const lang = (await cookies()).get("nz_locale")?.value ?? "uz";
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/orders/delivery-options?lang=${encodeURIComponent(lang)}`, { next: { revalidate: 300 } });
    const body = await res.json();
    return NextResponse.json(body, { status: res.ok ? 200 : res.status, headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNAVAILABLE", message: "Delivery prices are unavailable." } }, { status: 502 });
  }
}
