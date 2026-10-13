import { NextRequest, NextResponse } from "next/server";
import { OrdersApiError, cancelMyOrder } from "@/lib/orders-api";
import { getAccessToken } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    const data = await cancelMyOrder(accessToken, orderNumber, { reason: String(body.reason ?? "customer_request"), comment: String(body.comment ?? "").slice(0, 1000) });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof OrdersApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not cancel the order." } }, { status: 500 });
  }
}
