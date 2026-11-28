import { internalTokenHeader } from "@/lib/internal-token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** "Birga arzonroq": the companion product offered next to this one, with its discounted bundle price. */
export interface BundleOffer {
  source: "curated" | "auto";
  percent: string;
  product: { id: string; slug: string; name: string; primary_image_path: string | null; brand_id: string | null; rating_average: string | null; rating_count: number };
  variant_id: string;
  variant_label: string;
  price: string;
  bundle_price: string;
  saving: string;
}

/** Sovg'a aksiyasi: the NutriZone shaker recommended on proteins / gainers -- free on orders from `threshold`. */
export interface GiftCard {
  product_id: string;
  variant_id: string;
  name: string;
  names: Record<string, string>;
  slug: string;
  image_path: string | null;
  value: string | null;
  threshold?: string;
}

/** Cart / checkout: is the gift earned, and if not, how much is missing. */
export interface GiftStatus {
  earned: boolean;
  items_qualify: boolean;
  threshold: string;
  missing: string;
  gift: GiftCard;
}

export interface PriceHistory {
  points: [string, string][];
  min: string;
  max: string;
  current: string;
  changes: number;
  lowest_90d: boolean;
}

export interface ProductExtras {
  bundle: BundleOffer | null;
  gift?: GiftCard | null;
  trust: { official_distributor: boolean; expiry: Record<string, string> };
  price_history: Record<string, PriceHistory>;
  watching: string[];
}

export interface ProductQuestion {
  id: string;
  question: string;
  answer: string;
  author: string;
  asked_at: string;
  answered_at: string | null;
}

export interface ProductQuestions {
  items: ProductQuestion[];
  total: number;
  mine: { id: string; question: string; asked_at: string }[];
}

const EMPTY_EXTRAS: ProductExtras = { bundle: null, gift: null, trust: { official_distributor: false, expiry: {} }, price_history: {}, watching: [] };

async function get<T>(path: string, accessToken?: string | null): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { ...internalTokenHeader(), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      // personal bits (watched variants, own pending questions) when signed in; a short shared cache otherwise
      ...(accessToken ? { cache: "no-store" as const } : { next: { revalidate: 120 } }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

/** Bundle, trust facts, price history and watched variants for the product page -- never throws (a bonus block). */
export async function getProductExtras(slug: string, locale: string, accessToken?: string | null): Promise<ProductExtras> {
  return (await get<ProductExtras>(`/api/v1/products/${encodeURIComponent(slug)}/extras?filter[locale]=${encodeURIComponent(locale)}`, accessToken)) ?? EMPTY_EXTRAS;
}

export async function getProductQuestions(slug: string, accessToken?: string | null): Promise<ProductQuestions> {
  return (await get<ProductQuestions>(`/api/v1/products/${encodeURIComponent(slug)}/questions`, accessToken)) ?? { items: [], total: 0, mine: [] };
}

/** Authenticated write to the backend from a Next route handler; returns the backend's status and JSON envelope. */
export async function backendWrite(path: string, method: "POST" | "DELETE", accessToken: string, payload?: unknown): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...internalTokenHeader() },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({ success: false, error: { code: "UNKNOWN", message: "Unexpected response." } }));
  return { status: res.status, body };
}
