import { NextRequest, NextResponse } from "next/server";
import { OrdersApiError, getOrders } from "@/lib/orders-api";
import { getAccessToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in to view your orders." } }, { status: 401 });
  }

  const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(req.nextUrl.searchParams.get("pageSize") ?? "20");

  try {
    const result = await getOrders(accessToken, page, pageSize);
    return NextResponse.json({ success: true, data: result.orders, pagination: { totalPages: result.totalPages, totalCount: result.totalCount, page, pageSize } });
  } catch (err) {
    if (err instanceof OrdersApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load your orders." } }, { status: 500 });
  }
}
