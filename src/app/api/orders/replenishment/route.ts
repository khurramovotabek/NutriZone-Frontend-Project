import { NextRequest, NextResponse } from "next/server";
import { OrdersApiError, getRunningLow } from "@/lib/orders-api";
import { getAccessToken } from "@/lib/session";

/** GET ?locale= -- the signed-in customer's products that will run out soon. */
export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const data = await getRunningLow(accessToken, req.nextUrl.searchParams.get("locale") ?? undefined);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof OrdersApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load reminders." } }, { status: 500 });
  }
}
