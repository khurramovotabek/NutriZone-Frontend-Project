import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CartApiError, submitGuestCheckout, type GuestCheckoutInput } from "@/lib/cart-api";
import { clearCartCookies, getAccessToken, getCartCode, getCartToken, setSessionCookies } from "@/lib/session";

const UUID = /^[0-9a-f-]{36}$/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Order without signing in: name + phone (any format -- the backend reads "94 205 20 40", "+998...", "94-205-20-40")
 * + a map point or a branch. A brand-new number gets a guest account whose session is set here, so the order page and
 * online payment work; a number that already has an account gets the order there, without a session.
 */
export async function POST(req: NextRequest) {
  if (await getAccessToken()) {
    return NextResponse.json({ success: false, error: { code: "SIGNED_IN", message: "You are signed in -- use the normal checkout." } }, { status: 409 });
  }
  const code = await getCartCode();
  const token = await getCartToken();
  if (!code || !token) {
    return NextResponse.json({ success: false, error: { code: "NO_CART", message: "No active cart found." } }, { status: 404 });
  }
  const b = await req.json().catch(() => ({}));
  const pickup = b?.fulfilmentMethod === "pickup";
  const a = b?.address ?? {};
  const meta: Record<string, string> = {};
  for (const k of ["entrance", "floor", "unit", "entrance_code", "building_name", "delivery_instructions"]) {
    const v = str(a?.metadata?.[k], 500);
    if (v) meta[k] = v;
  }
  const input: GuestCheckoutInput = {
    full_name: str(b?.fullName, 255),
    phone: str(b?.phone, 40),
    fulfilment_method: pickup ? "pickup" : "delivery",
    ...(pickup && UUID.test(b?.pickupStoreId ?? "") ? { pickup_store_id: b.pickupStoreId } : {}),
    ...(!pickup && UUID.test(a?.countryId ?? "") && UUID.test(a?.cityId ?? "")
      ? {
          address: {
            country_id: a.countryId, city_id: a.cityId,
            region_id: UUID.test(a?.regionId ?? "") ? a.regionId : null,
            district_id: UUID.test(a?.districtId ?? "") ? a.districtId : null,
            line1: str(a?.line1, 255), metadata: meta,
            latitude: num(a?.latitude), longitude: num(a?.longitude), source: str(a?.source, 32) || "map_pin", accuracy_meters: num(a?.accuracy),
          },
        }
      : {}),
    comment: str(b?.comment, 500),
    payment_method: str(b?.paymentMethod, 20),
    language: (await cookies()).get("nz_locale")?.value ?? "uz",
  };
  try {
    const order = await submitGuestCheckout(code, token, input, randomUUID());
    if (order.session) await setSessionCookies(order.session);
    await clearCartCookies();
    // tokens stay in HttpOnly cookies only
    return NextResponse.json({
      success: true,
      data: { order_number: order.order_number, total: order.total, shipping_amount: order.shipping_amount, account: order.account, signed_in: !!order.session, checkout_url: order.checkout_url ?? null },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof CartApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not place the order." } }, { status: 500 });
  }
}
