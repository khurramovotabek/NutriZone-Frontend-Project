import { NextRequest, NextResponse } from "next/server";
import { LoyaltyApiError, getMyWalletTransactions } from "@/lib/loyalty-api";
import { getAccessToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const direction = params.get("direction");
  try {
    const result = await getMyWalletTransactions(accessToken, page, 10, direction === "in" || direction === "out" ? direction : undefined);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof LoyaltyApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load wallet history." } }, { status: 500 });
  }
}
