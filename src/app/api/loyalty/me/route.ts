import { NextResponse } from "next/server";
import { LoyaltyApiError, getMyLoyalty } from "@/lib/loyalty-api";
import { getAccessToken } from "@/lib/session";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    return NextResponse.json({ success: true, data: await getMyLoyalty(accessToken) });
  } catch (err) {
    if (err instanceof LoyaltyApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load your wallet." } }, { status: 500 });
  }
}
