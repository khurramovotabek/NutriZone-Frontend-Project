import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** GET -- the launch gift ("first 500 customers get 5 000 coins"): slots left, plus the shopper's own slot when signed in. */
export async function GET() {
  const accessToken = await getAccessToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/loyalty/signup-bonus`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      cache: "no-store",
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.ok ? 200 : res.status, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNAVAILABLE", message: "Gift campaign is unavailable." } }, { status: 502 });
  }
}
