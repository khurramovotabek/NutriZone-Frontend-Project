import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CartApiError, getGuestCheckoutPreview } from "@/lib/cart-api";
import { getCartCode, getCartToken } from "@/lib/session";

const UUID = /^[0-9a-f-]{36}$/i;

/** Checkout summary for a shopper who isn't signed in: prices locked server-side, delivery quoted for the map point. */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const code = await getCartCode();
  const token = await getCartToken();
  if (!code || !token) {
    return NextResponse.json({ success: false, error: { code: "NO_CART", message: "No active cart found." } }, { status: 404 });
  }
  const num = (v: string | null) => (v && Number.isFinite(Number(v)) ? Number(v) : null);
  try {
    const preview = await getGuestCheckoutPreview(code, token, {
      method: p.get("method") === "pickup" ? "pickup" : "delivery",
      cityId: UUID.test(p.get("city_id") ?? "") ? p.get("city_id") : null,
      regionId: UUID.test(p.get("region_id") ?? "") ? p.get("region_id") : null,
      lat: num(p.get("lat")), lng: num(p.get("lng")),
      lang: (await cookies()).get("nz_locale")?.value ?? null,
    });
    return NextResponse.json({ success: true, data: preview });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load checkout." } }, { status: 500 });
  }
}
