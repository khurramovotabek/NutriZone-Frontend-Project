import { NextResponse } from "next/server";
import { backendWrite } from "@/lib/pdp-api";
import { getAccessToken } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "Narx tushsa xabar bering": POST starts watching the variant's price, DELETE stops. Signed-in shoppers only. */
async function handle(method: "POST" | "DELETE", params: Promise<{ variantId: string }>) {
  const { variantId } = await params;
  if (!UUID.test(variantId)) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Invalid variant." } }, { status: 422 });
  }
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const { status, body } = await backendWrite(`/api/v1/products/price-watch/${variantId}`, method, accessToken);
    return NextResponse.json(body, { status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not reach the server." } }, { status: 502 });
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ variantId: string }> }) {
  return handle("POST", params);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ variantId: string }> }) {
  return handle("DELETE", params);
}
