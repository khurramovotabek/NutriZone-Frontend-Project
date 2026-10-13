import { NextResponse } from "next/server";
import { getPaymentMethods } from "@/lib/payments-api";

/** GET -- checkout's payment methods (public; unavailable ones come back as "coming_soon"). */
export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await getPaymentMethods() });
  } catch {
    // Cash on delivery keeps checkout working even if the payments service is unreachable.
    return NextResponse.json({ success: true, data: [], degraded: true });
  }
}
