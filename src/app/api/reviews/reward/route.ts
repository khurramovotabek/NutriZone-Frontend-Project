import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { internalTokenHeader } from "@/lib/internal-token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** "+N coin for a review" offer for the product page form -- personalised (received / already rewarded) when signed in. */
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("product_id") ?? "";
  const token = await getAccessToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/reviews/reward?product_id=${encodeURIComponent(productId)}`, {
      headers: { ...internalTokenHeader(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      cache: "no-store",
    });
    const body = await res.json();
    return NextResponse.json({ success: res.ok, data: body.data ?? null }, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ success: false, data: null }, { status: 502 });
  }
}
