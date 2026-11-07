import { NextResponse } from "next/server";
import { LoyaltyApiError, getMyLoyalty } from "@/lib/loyalty-api";
import { getAccessToken } from "@/lib/session";

export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  // ?soft=1 (the public /loyalty page): a guest is a normal visitor there, not an error -- 200 with no wallet
  if (!accessToken && new URL(request.url).searchParams.get("soft") === "1") {
    return NextResponse.json({ success: true, data: null, guest: true });
  }
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
