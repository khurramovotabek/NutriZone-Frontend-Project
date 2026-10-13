import { NextResponse } from "next/server";
import { OrdersApiError, getAfterSales } from "@/lib/orders-api";
import { getAccessToken } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    return NextResponse.json({ success: true, data: await getAfterSales(accessToken, orderNumber) });
  } catch (err) {
    if (err instanceof OrdersApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load order actions." } }, { status: 500 });
  }
}
