import { NextRequest, NextResponse } from "next/server";
import { OrdersApiError, getOrder } from "@/lib/orders-api";
import { getAccessToken } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in to view this order." } }, { status: 401 });
  }

  try {
    const order = await getOrder(accessToken, orderNumber);
    return NextResponse.json({ success: true, data: order });
  } catch (err) {
    if (err instanceof OrdersApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load this order." } }, { status: 500 });
  }
}
