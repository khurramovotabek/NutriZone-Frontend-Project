import { NextResponse } from "next/server";
import { getLoyaltyTiers, getMyLoyaltyRate, type LoyaltyRate } from "@/lib/loyalty-api";
import { getAccessToken } from "@/lib/session";

/** GET -- the shopper's cashback rate for product pages: their own tier when signed in, else the entry tier (logged_in: false). */
export async function GET() {
  const accessToken = await getAccessToken();
  if (accessToken) {
    try {
      const data: LoyaltyRate = { logged_in: true, ...(await getMyLoyaltyRate(accessToken)) };
      return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      // Expired session etc. -- fall through to the public rate.
    }
  }
  try {
    const { data: tiers } = await getLoyaltyTiers();
    const data: LoyaltyRate = { logged_in: false, current_tier: tiers[0] ?? null, next_tier: null, amount_to_next: null };
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load the cashback rate." } }, { status: 500 });
  }
}
