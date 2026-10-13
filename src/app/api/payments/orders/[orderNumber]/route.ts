import { NextResponse } from "next/server";
import { PaymentsApiError, getOrderPayment } from "@/lib/payments-api";
import { getAccessToken } from "@/lib/session";

/** GET -- is my order paid / can it still be paid online (order page, after returning from the provider). */
export async function GET(_req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  try {
    return NextResponse.json({ success: true, data: await getOrderPayment(accessToken, orderNumber) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const e = err instanceof PaymentsApiError ? err : new PaymentsApiError(500, "UNKNOWN", "Could not load the payment.");
    return NextResponse.json({ success: false, error: { code: e.code, message: e.message } }, { status: e.status });
  }
}
