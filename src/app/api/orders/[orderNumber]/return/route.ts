import { NextRequest, NextResponse } from "next/server";
import { OrdersApiError, requestMyReturn, type AfterSalesItem } from "@/lib/orders-api";
import { getAccessToken } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const lines: AfterSalesItem[] = Array.isArray(body.lines)
    ? body.lines
        .map((l: { order_line_item_id?: unknown; quantity?: unknown }) => ({ order_line_item_id: String(l.order_line_item_id ?? ""), quantity: Number(l.quantity) }))
        .filter((l: AfterSalesItem) => l.order_line_item_id && Number.isInteger(l.quantity) && l.quantity > 0)
    : [];
  try {
    const data = await requestMyReturn(accessToken, orderNumber, { reason: String(body.reason ?? "other"), comment: String(body.comment ?? "").slice(0, 1000), lines });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    if (err instanceof OrdersApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not send the return request." } }, { status: 500 });
  }
}
