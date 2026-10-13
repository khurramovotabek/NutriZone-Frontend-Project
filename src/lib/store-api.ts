import { API_BASE_URL, apiFetch, ApiError } from "@/lib/api";

export interface StoreListItem {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive" | "temporarily_closed" | "coming_soon";
  logo_url: string | null;
  cover_image_url: string | null;
  address: string;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  is_open_now: boolean;
  distance_meters: number | null;
  /** Field names deliberately match ProductCard's own rating_average/rating_count -- one consistent rating shape across the whole app. `null` average means no ratings yet, never a fabricated 0. */
  rating_average: number | null;
  rating_count: number;
  /** The store's brand colour (Dashboard), used as its accent everywhere. */
  color?: string;
  phone?: string | null;
  /** Today's effective hours in Tashkent time; a special day wins over the weekly schedule. */
  today_hours?: { open: string; close: string; closed: boolean; special: boolean; note: string };
  product_count?: number | null;
  tagline?: string;
  amenities?: string[];
  landmark?: string;
  pickup_enabled?: boolean;
}

export interface StoreMediaItem {
  url: string;
  is_video: boolean;
  sort_order: number;
}

export interface StoreProductItem {
  id: number;
  product_variant_id: string;
  product_id: string;
  name: string;
  /** Set only for a published product -- links to its page. */
  product_slug?: string | null;
  sku: string;
  image_url: string | null;
  /** Units available at this store (on hand minus reserved). */
  quantity: number;
  weight_value?: number | null;
  weight_unit?: string | null;
  price?: string | null;
  currency?: string | null;
  compare_at_price?: string | null;
  discount_percent?: number | null;
}

export interface StoreDetail extends StoreListItem {
  description: string;
  phone_numbers: string[];
  email: string;
  telegram_username: string;
  instagram_username: string;
  working_hours: Record<string, { open: string; close: string; closed: boolean }>;
  special_hours: Array<{ date: string; open?: string; close?: string; closed?: boolean }>;
  media: StoreMediaItem[];
  products: StoreProductItem[];
  owner_full_name: string | null;
  upcoming_special_days?: Array<{ date: string; open?: string; close?: string; closed?: boolean; note?: string }>;
}

export interface StoreListFilters {
  city?: string;
  district?: string;
  openNow?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
}

export interface PaginatedStores {
  count: number;
  next: string | null;
  previous: string | null;
  results: StoreListItem[];
  /** Facets across every public store (not just this page). */
  cities?: string[];
  open_now_count?: number;
}

export async function getStores(filters: StoreListFilters = {}): Promise<PaginatedStores> {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.district) params.set("district", filters.district);
  if (filters.openNow) params.set("open_now", "true");
  if (filters.lat !== undefined) params.set("lat", String(filters.lat));
  if (filters.lng !== undefined) params.set("lng", String(filters.lng));
  if (filters.radiusKm !== undefined) params.set("radius_km", String(filters.radiusKm));
  if (filters.page) params.set("page", String(filters.page));

  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/v1/stores${query ? `?${query}` : ""}`, { next: { revalidate: 60 } });
  if (!response.ok) {
    throw new ApiError(response.status, `Request to /api/v1/stores failed with status ${response.status}`);
  }
  return response.json();
}

export async function getStoreBySlug(slug: string) {
  return apiFetch<StoreDetail>(`/api/v1/stores/${slug}`);
}

// --- My Store (authenticated, customer self-service) ---

async function authedFetch<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...init?.headers },
  });
  if (response.status === 204) return undefined as T;
  if (!response.ok) {
    let message = `Request to ${path} failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // Non-JSON error body -- keep the generic message.
    }
    throw new ApiError(response.status, message);
  }
  const body = await response.json();
  return (body?.data ?? body) as T;
}

export interface MyStoreUpdateInput {
  name?: string;
  description?: string;
  phone_numbers?: string[];
  email?: string;
  telegram_username?: string;
  instagram_username?: string;
  address?: string;
  city?: string;
  district?: string;
  latitude?: number | null;
  longitude?: number | null;
  working_hours?: Record<string, { open: string; close: string; closed: boolean }>;
  special_hours?: Array<{ date: string; open?: string; close?: string; closed?: boolean }>;
}

export async function getMyStore(accessToken: string): Promise<StoreDetail> {
  return authedFetch<StoreDetail>("/api/v1/my-store", accessToken);
}

export async function updateMyStore(accessToken: string, input: MyStoreUpdateInput): Promise<StoreDetail> {
  return authedFetch<StoreDetail>("/api/v1/my-store", accessToken, { method: "PATCH", body: JSON.stringify(input) });
}

export async function addMyStoreProduct(accessToken: string, productVariantId: string, quantity: number) {
  return authedFetch<{ id: number; product_variant_id: string; quantity: number }>("/api/v1/my-store/products", accessToken, {
    method: "POST",
    body: JSON.stringify({ product_variant_id: productVariantId, quantity }),
  });
}

export async function updateMyStoreProduct(accessToken: string, entryId: number, quantity: number) {
  return authedFetch<{ id: number; quantity: number }>(`/api/v1/my-store/products/${entryId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function removeMyStoreProduct(accessToken: string, entryId: number): Promise<void> {
  await authedFetch<void>(`/api/v1/my-store/products/${entryId}`, accessToken, { method: "DELETE" });
}
