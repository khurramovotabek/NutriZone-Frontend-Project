/**
 * Loyalty programme & wallet -- types plus server-side calls to the
 * Django `loyalty` app. 1 so'm of fulfilled spend = 1 coin at the tier %.
 * Amounts arrive as plain decimal strings (never floats) and coins as
 * integers; formatting happens in the UI.
 */
import { API_BASE_URL, apiFetch } from "@/lib/api";

export type TierIconKey = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "elite" | "legend" | "vip";

export interface LoyaltyTier {
  id: string;
  name: string;
  slug: string;
  min_spend: string;
  max_spend: string | null;
  percent: string;
  icon: TierIconKey;
  color: string;
  description: string;
}

export interface LoyaltySummary {
  member_name: string;
  member_since: string | null;
  /** Every active tier, lowest first -- the full ladder for journey/calculator views. */
  tiers: LoyaltyTier[];
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  total_spend: string;
  order_count: number;
  current_tier: LoyaltyTier | null;
  next_tier: LoyaltyTier | null;
  amount_to_next: string | null;
  progress_percent: number;
  coin_rate: string;
  programme: {
    tier_window_days: number;
    coin_expiry_days: number;
    max_redeem_percent: number;
    min_redeem_coins: number;
    redeem_enabled: boolean;
    referral_enabled: boolean;
    referrer_reward: number;
    referee_reward: number;
  };
  expiring: { coins: number; first_expiry: string } | null;
  /** Upcoming expiry dates (lots grouped by day), soonest first. */
  expiry_schedule: { date: string; coins: number }[];
  /** Set when purchases leaving the rolling window would drop the tier within 30 days. */
  tier_risk: { tier: LoyaltyTier; falls_to: LoyaltyTier | null; needed: string; drop_date: string; days_left: number } | null;
  referral: {
    code: string;
    invited_count: number;
    rewarded_count: number;
    earned_coins: number;
    can_enter_code: boolean;
    referred_by: string | null;
    referred_status: "pending" | "rewarded" | "void" | null;
    friends: { name: string; status: "pending" | "rewarded" | "void"; joined_at: string }[];
  };
}

/** What a shopper earns right now (product pages). Guests get the entry tier and logged_in=false. */
export interface LoyaltyRate {
  logged_in: boolean;
  current_tier: LoyaltyTier | null;
  next_tier: LoyaltyTier | null;
  amount_to_next: string | null;
}

export interface WalletTransaction {
  id: string;
  kind: "earn" | "referral" | "refund" | "adjustment" | "spend" | "reversal" | "expiry";
  amount: number;
  balance_after: number;
  order_id: string | null;
  order_number: string | null;
  /** True when order_number is one of the customer's own online orders (POS sales/returns have no page). */
  order_linkable: boolean;
  order_amount: string | null;
  tier_name: string | null;
  tier_percent: string | null;
  note: string | null;
  created_at: string;
  /** Credit lots only: unspent coins and when they burn (null once used up / for debits). */
  remaining: number;
  expires_at: string | null;
}

export type WalletDirection = "in" | "out";

export class LoyaltyApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function getLoyaltyTiers() {
  return apiFetch<LoyaltyTier[]>("/api/v1/loyalty/tiers");
}

async function authed(path: string, accessToken: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new LoyaltyApiError(response.status, body?.error?.code ?? "UNKNOWN", body?.error?.message ?? "Request failed");
  }
  return body;
}

export async function getMyLoyalty(accessToken: string): Promise<LoyaltySummary> {
  return (await authed("/api/v1/loyalty/me", accessToken)).data as LoyaltySummary;
}

export async function getMyWalletTransactions(accessToken: string, page = 1, pageSize = 20, direction?: WalletDirection) {
  const body = await authed(`/api/v1/loyalty/me/transactions?page=${page}&page_size=${pageSize}${direction ? `&direction=${direction}` : ""}`, accessToken);
  return { data: body.data as WalletTransaction[], pagination: body.pagination as { page: number; total_pages: number; total_count: number } };
}

export async function getMyLoyaltyRate(accessToken: string): Promise<Omit<LoyaltyRate, "logged_in">> {
  return (await authed("/api/v1/loyalty/me/rate", accessToken)).data;
}
