import { NextRequest, NextResponse } from "next/server";
import { PaymentsApiError, startOrderPayment, type PaymentMethodKey } from "@/lib/payments-api";
import { getAccessToken } from "@/lib/session";

const METHODS = new Set<PaymentMethodKey>(["payme", "click", "uzum", "uzcard", "humo"]);

/** POST { method } -- start paying my order online; answers the provider's hosted checkout URL. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const method = body?.method as PaymentMethodKey;
  if (!METHODS.has(method)) return NextResponse.json({ success: false, error: { code: "METHOD_NOT_AVAILABLE", message: "Unknown payment method." } }, { status: 422 });
  const lang = ["uz", "ru", "en"].includes(body?.lang) ? body.lang : "uz";
  try {
    return NextResponse.json({ success: true, data: await startOrderPayment(accessToken, orderNumber, method, lang) });
  } catch (err) {
    const e = err instanceof PaymentsApiError ? err : new PaymentsApiError(500, "UNKNOWN", "Could not start the payment.");
    return NextResponse.json({ success: false, error: { code: e.code, message: e.message } }, { status: e.status });
  }
}
