import SignupGiftBanner, { type Campaign } from "@/components/loyalty/SignupGiftBanner";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** The opening-gift banner rendered on the server, so it is part of the first paint instead of popping in later.
 * A slow or failed backend answer (> 1.5 s) just leaves the banner out -- it never holds the page up. */
export default async function SignupGiftBannerServer({ className = "" }: { className?: string }) {
  let campaign: Campaign | null = null;
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/loyalty/signup-bonus`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    const body = await res.json();
    if (body?.success) campaign = body.data as Campaign;
  } catch {
    campaign = null;
  }
  return <SignupGiftBanner className={className} initial={campaign} />;
}
