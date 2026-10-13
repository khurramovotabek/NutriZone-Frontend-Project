/**
 * Server-only: applies a remembered invite code (the `nz_ref` cookie set by
 * <ReferralCapture/> when someone opens a `?ref=CODE` link) right after a
 * session is created. The backend decides eligibility (new customers only,
 * never your own code); whatever the outcome, the cookie is consumed so the
 * attempt happens once.
 */
import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/api";

export const REFERRAL_COOKIE = "nz_ref";

export async function applyPendingReferral(accessToken: string): Promise<void> {
  const store = await cookies();
  const code = store.get(REFERRAL_COOKIE)?.value;
  if (!code) return;
  store.delete(REFERRAL_COOKIE);
  try {
    await fetch(`${API_BASE_URL}/api/v1/loyalty/referral/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ code, channel: "web" }),
      cache: "no-store",
    });
  } catch {
    // Best effort -- a bonus must never block signing in.
  }
}
