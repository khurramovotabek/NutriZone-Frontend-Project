import { NextRequest, NextResponse } from "next/server";
import { AuthApiError, getTelegramAuthSessionStatus, startTelegramWebAppSession } from "@/lib/auth-api";
import { addCartItem, getCart } from "@/lib/cart-api";
import { getCartCode, getCartToken, setCartCookies, setSessionCookies } from "@/lib/session";
import { applyPendingReferral } from "@/lib/referral-server";

/**
 * The Mini App and the bot chat share ONE cart: the backend hands back the shopper's bot cart; anything already in
 * this browser's own cart (added before signing in) is moved into it, then the cookies point at the shared cart.
 * Best effort -- signing in never fails because of the cart.
 */
async function adoptBotCart(accessToken: string, shared: { code: string; token: string }) {
  const [code, token] = [await getCartCode(), await getCartToken()];
  if (code === shared.code) return;
  if (code && token) {
    const own = await getCart(accessToken, code, token).catch(() => null);
    for (const item of own?.items.filter((i) => i.status !== "removed") ?? []) {
      await addCartItem(accessToken, shared.code, shared.token, item.product_variant_id, item.quantity).catch(() => null);
    }
  }
  await setCartCookies(shared.code, shared.token);
}

/** POST {initData} from the Telegram Mini App -> session cookies, through the same bot-initiated session as /auto-login. */
export async function POST(req: NextRequest) {
  let initData = "";
  try {
    initData = String((await req.json())?.initData ?? "");
  } catch {
    // fall through to the validation error below
  }
  if (!initData) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "initData is required." } }, { status: 422 });
  }
  try {
    const { session_id, cart } = await startTelegramWebAppSession(initData);
    const result = await getTelegramAuthSessionStatus(session_id);
    if (result.status !== "verified" || !result.access_token || !result.refresh_token) {
      return NextResponse.json({ success: false, error: { code: "SESSION_NOT_READY", message: `Session status: ${result.status}` } }, { status: 409 });
    }
    await setSessionCookies({ access_token: result.access_token, refresh_token: result.refresh_token, session_id, is_new_user: false });
    if (cart?.code && cart?.token) await adoptBotCart(result.access_token, cart).catch(() => null);
    await applyPendingReferral(result.access_token);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not sign in." } }, { status: 500 });
  }
}
