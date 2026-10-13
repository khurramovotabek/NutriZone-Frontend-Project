/**
 * Server-only calls to the real NutriZone Wishlist API
 * (`/api/v1/wishlist`), added this phase.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface WishlistItem {
  id: string;
  slug: string;
  name: string;
  status: string;
  brand_id: string | null;
  category_id: string | null;
  primary_image_path: string | null;
  default_variant_id: string | null;
  created_at: string;
  price: string | null;
  currency: string | null;
  rating_average: number | null;
  rating_count: number;
  wishlisted_at: string;
}

export interface BackendErrorBody {
  success: false;
  error: { code: string; message: string; category: string; details: Record<string, unknown> };
}

export class WishlistApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "WishlistApiError";
  }
}

async function wishlistFetch<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(init.headers as Record<string, string>) };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new WishlistApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as T;
}

export async function getWishlist(accessToken: string): Promise<WishlistItem[]> {
  return wishlistFetch<WishlistItem[]>("/api/v1/wishlist?page_size=100", accessToken);
}

export async function addToWishlist(accessToken: string, productId: string): Promise<void> {
  await wishlistFetch("/api/v1/wishlist", accessToken, { method: "POST", body: JSON.stringify({ product_id: productId }) });
}

export async function removeFromWishlist(accessToken: string, productId: string): Promise<void> {
  await wishlistFetch(`/api/v1/wishlist/${productId}`, accessToken, { method: "DELETE" });
}

/**
 * Real, closed gap: every ProductCard grid except the Wishlist page
 * itself and the Product Detail page always passed `initialWishlisted`
 * as its default `false` -- so a product a customer had genuinely
 * already liked showed an empty (unfilled) heart on the Home page,
 * Products/Category/Brand listings, and Related Products, every time,
 * until they opened that exact product's own detail page. Never a
 * page-breaking dependency (same as the pre-existing product-detail
 * page's own try/catch around `getWishlist`) -- an empty Set on
 * failure just means every card falls back to its old, honest
 * "not wishlisted" default instead of crashing the page.
 */
export async function getWishlistedIds(accessToken: string | null): Promise<Set<string>> {
  if (!accessToken) return new Set();
  try {
    const items = await getWishlist(accessToken);
    return new Set(items.map((item) => item.id));
  } catch {
    return new Set();
  }
}
