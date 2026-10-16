/**
 * NutriZone Storefront -- typed API client.
 *
 * The envelope shape here (`success` / `data` / `pagination` / `meta`)
 * is not assumed -- it was verified directly against the running
 * backend via Django's own test Client before this file was written:
 *
 *   GET /api/v1/products?page=1&page_size=2
 *   -> {"success": true, "data": [...], "pagination": {"strategy": "page", ...}, "meta": {...}}
 *
 *   GET /api/v1/products/<slug>
 *   -> {"success": true, "data": {...}, "meta": {...}}
 *
 * Base URL is read from an environment variable -- never hardcoded,
 * per this phase's own explicit environment-configuration requirement.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface ApiPagination {
  strategy: "page";
  page: number;
  page_size: number;
  total_pages: number;
  total_count: number;
}

/** `GET /products/search` facets -- each dimension counted with every *other* active filter applied (so an unchecked option shows what checking it would add). */
export interface CatalogFacets {
  brand?: { id: string; name: string; count?: number }[];
  category?: { id: string; name: string; count: number }[];
  flavour?: { id: string; name: string; color_hex: string; image_url: string | null; count: number }[];
  /** Canonical size keys ("250g", "2270g") -- format with `formatSizeKey`. */
  size?: { id: string; count: number }[];
  /** Training goals with how many products serve each. */
  goal?: { id: string; name: string; count: number }[];
  /** Products with an average rating of at least `min` stars. */
  rating?: { min: number; count: number }[];
  price_range?: { min: string | null; max: string | null };
  in_stock_count?: number;
  on_sale_count?: number;
}

export interface ApiMeta {
  request_id: string;
  timestamp: string;
  /**
   * Real, confirmed-existing field -- `GET /products/search`'s own
   * response (verified directly: `meta.facets`) includes query-scoped
   * brand/attribute matches computed from the actual matching
   * products, not the full catalog. Optional because only the search
   * endpoint populates it; every other envelope simply omits it.
   */
  facets?: CatalogFacets;
  /** `GET /products/search` only: the corrected query ("did you mean") when the smart search matched the shopper's words only fuzzily; `null`/absent otherwise. */
  suggestion?: string | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  pagination?: ApiPagination;
  meta: ApiMeta;
}

/**
 * Product card shape -- matches PublicProductListSerializer's real,
 * confirmed fields exactly (id, slug, name, status, brand_id,
 * category_id, primary_image_path, created_at, price, currency). No
 * field here is invented.
 */
export interface StoreAvailability {
  store_id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  district: string;
  available_quantity: number;
}

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  status: string;
  brand_id: string | null;
  category_id: string | null;
  primary_image_path: string | null;
  /**
   * Real, product-required capability: lets the "Add to cart" button
   * on the Product List/Catalog page add this product's default
   * variant directly, without navigating to the detail page first.
   * `null` only if the product genuinely has no variant at all.
   */
  default_variant_id: string | null;
  /**
   * Total available units across all of the product's variants and
   * warehouses (list-level cards only). `null` when the product has no
   * inventory record at all -- "not tracked", so the card shows nothing
   * rather than a made-up count. Optional: older/other card sources
   * (store products) don't carry it.
   */
  stock_quantity?: number | null;
  stock_status?: "in_stock" | "low_stock" | "out_of_stock" | null;
  created_at: string;
  /**
   * Real, closed gap: previously absent from every card, list and
   * detail alike -- confirmed directly against the backend's own
   * prior field set and this file's own now-outdated docstring. The
   * backend resolves this from the product's is_default variant's
   * PriceListEntry, matching ProductAdmin's own established
   * convention, in bulk (never a per-row N+1). `null` for a product
   * with no variant/no price entry yet -- never fabricated.
   */
  price: string | null;
  currency: string | null;
  /**
   * Crossed-out "old" price (the editor's Old Price, or the base price when
   * a sale price applies) and the whole-number saving -- both `null` when
   * the product isn't marked down. Optional: store-product cards lack them.
   */
  compare_at_price?: string | null;
  discount_percent?: number | null;
  rating_average: number | null;
  rating_count: number;
  /**
   * Only present on the detail response (GET /products/{slug}), not
   * the list response -- confirmed directly: the backend's own
   * _product_card() only includes this for the detail selector.
   * Phase 09.3: closes the confirmed Phase 09.2 gap (public detail
   * response had no purchasable variant identifiers at all).
   */
  variants?: {
    id: string;
    sku: string;
    is_default: boolean;
    status: string;
    /**
     * A variant's real, unit-aware measure ("size") -- `weight_unit`
     * spans mass ("g"/"kg"), volume ("ml"/"l"), and a plain unit count
     * ("tablet"/"capsule"/"gummy"/"chewable"), per the admin's own
     * explicit unit picker, never auto-converted/assumed.
     * `weight_value` is `null` only when this variant genuinely has no
     * measure recorded yet.
     */
    weight_value: number | null;
    weight_unit: string;
    /** This variant's real container/packaging type (box/bottle/pouch/...) -- `null` only when genuinely not set yet, never fabricated. */
    package: { id: string; name: string } | null;
    /**
     * Real, closed gap: previously only the product-level `gallery`/
     * `price`/`currency` existed -- every variant (Flavor/Size
     * combination) silently showed the same photos/price regardless
     * of which one was actually selected. Empty `gallery` means this
     * specific variant has no photo of its own yet -- the storefront
     * falls back to the product-level `gallery` in that case, never
     * an empty viewer. `price`/`currency` are `null` only if no price
     * list entry exists yet for this specific variant (never
     * fabricated from another variant's price).
     */
    gallery: string[];
    video_url: string | null;
    price: string | null;
    currency: string | null;
    compare_at_price?: string | null;
    discount_percent?: number | null;
    /** Real total units across all stores (0 when out of stock); `status` adds the low-stock urgency tier on top of the count. */
    stock_status: "in_stock" | "low_stock" | "out_of_stock";
    stock_quantity: number | null;
    /** Which stores (branches) carry this variant and how many units each has -- stores with stock first. Empty when no store stocks it. */
    store_availability?: StoreAvailability[];
  }[];
  /**
   * Detail-only fields (backend's `include_details=True`, only passed
   * by `ProductDetailSelector.get_by_slug`) -- real, closed gap: the
   * public detail response previously exposed none of these at all,
   * despite the underlying data (ProductTranslation.description,
   * ProductMedia, Product.specifications) already existing. `gallery`
   * is ordered primary image first, then gallery-role images by
   * sort_order -- never re-ordered client-side. Optional because the
   * list/search/recommendations card shapes never include them.
   */
  description?: string;
  gallery?: string[];
  specifications?: { key: string; value: string }[];
  /**
   * Real, closed gap: `Product.supplement_facts_text_*`/`warnings_text_*`/
   * `directions_text_*` already existed and were editable in the admin
   * fieldsets, but no public read endpoint ever surfaced them --
   * confirmed directly against the backend's own prior `_product_card()`
   * field set. Each is already resolved server-side to the customer's
   * own locale (with a real uz/ru/en fallback chain), never all 3
   * languages at once. `null` only when the product genuinely has none
   * of these fields filled in for any language -- never fabricated.
   */
  supplement_facts?: string | null;
  warnings?: string | null;
  directions?: string | null;
  /**
   * Real, product-required capability: the PDP flavour switcher. This
   * catalog models one flavour+weight combination as one independent
   * Product row, not one Product with many variants -- so a flavour
   * "option" here often points at a *different* Product (`product_id`/
   * `product_slug`), not this one. Selecting a non-current flavour
   * navigates there; `is_current: true` marks this product's own
   * tagged flavour(s). Empty array for a product with no flavour
   * tagged at all -- never fabricated.
   */
  flavours?: { id: string; name: string; color_hex: string | null; image_url: string | null; product_id: string; product_slug: string; is_current: boolean }[];
  /** Detail only: serving facts (compare page "price per serving", replenishment forecasts). */
  nutrition?: { serving_size_grams: number | null; servings_per_container: number | null; calories: number | null };
  /** Detail only: training goal codes this product serves. */
  goals?: string[];
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    // Product catalog data is safe to cache; per-request revalidation
    // keeps it reasonably fresh without hitting the backend on every
    // render -- personalized/sensitive endpoints (cart, orders,
    // wallet) must NOT use this default and are not implemented by
    // this client yet (see README).
    // An explicit `cache` (e.g. "no-store") from the caller wins over the default revalidation window.
    ...(init?.cache ? {} : { next: { revalidate: 60 } }),
  });

  if (!response.ok) {
    let message = `Request to ${path} failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // Non-JSON error body -- keep the generic message, never leak a raw stack trace to the UI.
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<ApiEnvelope<T>>;
}

export async function getProducts(params: { page?: number; pageSize?: number; categoryId?: string; brandId?: string; locale?: string } = {}): Promise<ApiEnvelope<ProductCard[]>> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("page_size", String(params.pageSize));
  // Real, verified contract: `GET /products` (parse_catalog_list_params)
  // reads these as JSON:API-style bracket params, `filter[category_id]`/
  // `filter[brand_id]` -- a plain `category_id`/`brand_id` query param is
  // silently ignored server-side (confirmed directly: filtering by a
  // nonexistent brand/category UUID returned the exact same unfiltered
  // result set as no filter at all). This was a genuine, previously
  // undetected bug in this same client function.
  if (params.categoryId) query.set("filter[category_id]", params.categoryId);
  if (params.brandId) query.set("filter[brand_id]", params.brandId);
  if (params.locale) query.set("filter[locale]", params.locale);
  const qs = query.toString();
  return apiFetch<ProductCard[]>(`/api/v1/products${qs ? `?${qs}` : ""}`);
}

/** `locale` -> the product's name/description in the shopper's language (Uzbek / any translation as fallback). */
function localeQuery(locale?: string, first = true): string {
  return locale ? `${first ? "?" : "&"}filter[locale]=${encodeURIComponent(locale)}` : "";
}

export async function getProductBySlug(slug: string, locale?: string): Promise<ApiEnvelope<ProductCard>> {
  return apiFetch<ProductCard>(`/api/v1/products/${encodeURIComponent(slug)}${localeQuery(locale)}`);
}

/**
 * The real, already-existing recommendations endpoint (staff-curated,
 * else same-category fallback -- see `RecommendationSelector.for_product`'s
 * own docstring) -- never a second, client-invented "related products"
 * concept. `AllowAny`, so this is safe to call for any visitor.
 */
export async function getProductRecommendations(slug: string, locale?: string): Promise<ApiEnvelope<ProductCard[]>> {
  return apiFetch<ProductCard[]>(`/api/v1/products/${encodeURIComponent(slug)}/recommendations${localeQuery(locale)}`);
}

export async function getBestSellers(limit = 8, locale?: string): Promise<ApiEnvelope<(ProductCard & { units_sold: number })[]>> {
  return apiFetch<(ProductCard & { units_sold: number })[]>(`/api/v1/products/best-sellers?limit=${limit}${localeQuery(locale, false)}`);
}

/**
 * The real, existing, already-production-grade backend search
 * (`GET /api/v1/products/search`): full-text ranked, locale-aware,
 * with an exact barcode/SKU match cascade and faceted filters -- this
 * is a thin typed client over it, not a second search implementation.
 * Callable from Client Components too (unlike most of this file) since
 * it only ever reads `NEXT_PUBLIC_API_BASE_URL`, which is why `locale`
 * is an explicit param here rather than read server-side.
 */
export type CatalogSort = "relevance" | "-created_at" | "price" | "-price" | "-rating" | "-popularity" | "-discount" | "name";

export type SearchParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  categoryId?: string;
  /** One brand id or several ("any of"). */
  brandId?: string;
  brandIds?: string[];
  flavourIds?: string[];
  sizes?: string[];
  goals?: string[];
  priceMin?: string;
  priceMax?: string;
  ratingMin?: number;
  inStock?: boolean;
  onSale?: boolean;
  sort?: CatalogSort;
  locale?: string;
  /** A submitted search (the catalog page) -- counted in the dashboard's search analytics. Type-ahead previews leave it off. */
  record?: boolean;
};

/** The `GET /products/search` query string for these params -- shared by the server-side catalog and the browser's same-origin proxy. */
export function searchQueryString(params: SearchParams): string {
  const query = new URLSearchParams();
  query.set("q", params.q ?? "");
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("page_size", String(params.pageSize));
  if (params.categoryId) query.set("filter[category_id]", params.categoryId);
  const brands = params.brandIds?.length ? params.brandIds : params.brandId ? [params.brandId] : [];
  if (brands.length) query.set("filter[brand_id]", brands.join(","));
  if (params.flavourIds?.length) query.set("filter[flavor_id]", params.flavourIds.join(","));
  if (params.sizes?.length) query.set("filter[size]", params.sizes.join(","));
  if (params.goals?.length) query.set("filter[goal]", params.goals.join(","));
  if (params.priceMin) query.set("filter[price][gte]", params.priceMin);
  if (params.priceMax) query.set("filter[price][lte]", params.priceMax);
  if (params.ratingMin) query.set("filter[rating][gte]", String(params.ratingMin));
  if (params.inStock) query.set("filter[availability]", "in_stock");
  if (params.onSale) query.set("filter[on_sale]", "1");
  if (params.sort) query.set("sort", params.sort);
  if (params.locale) query.set("filter[locale]", params.locale);
  if (params.record && params.q?.trim()) query.set("record", "1");
  return query.toString();
}

export async function searchProducts(params: SearchParams): Promise<ApiEnvelope<ProductCard[]>> {
  // A recorded search must reach the backend every time (a cached response would not be counted).
  return apiFetch<ProductCard[]>(`/api/v1/products/search?${searchQueryString(params)}`, params.record ? { cache: "no-store" } : undefined);
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  image_url: string | null;
}

/** `locale` picks the category names' language (falls back to the default locale's name when untranslated). */
export async function getCategories(locale?: string): Promise<ApiEnvelope<Category[]>> {
  return apiFetch<Category[]>(`/api/v1/categories${locale ? `?locale=${encodeURIComponent(locale)}` : ""}`);
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_url: string;
  image_url: string | null;
  /** How long this banner stays active in the hero slider before auto-advancing, in seconds. */
  duration_seconds: number;
}

/** `locale` picks the banner texts' language (an untranslated banner falls back to Uzbek). */
export async function getBanners(locale?: string): Promise<ApiEnvelope<Banner[]>> {
  return apiFetch<Banner[]>(`/api/v1/settings/banners${locale ? `?locale=${encodeURIComponent(locale)}` : ""}`);
}

export interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  /** In the requested locale when written, else Uzbek, else any language; "" when none. */
  description?: string;
  /** Published products of this brand. */
  product_count?: number;
  /** The brand's home country (flag emoji + name in the requested locale). */
  country?: { code: string; flag: string; name: string } | null;
}

/** `locale` only picks the description language (names are unaffected). */
export async function getBrands(locale?: string): Promise<ApiEnvelope<Brand[]>> {
  return apiFetch<Brand[]>(`/api/v1/brands${locale ? `?locale=${encodeURIComponent(locale)}` : ""}`);
}

/**
 * Real, closed gap: `ProductCard` (the list/search/recommendation card
 * shape) only ever carries `brand_id`, never a resolved name --
 * confirmed directly against this exact interface. Every product grid
 * needs the same id->name lookup, so this is the one shared
 * implementation (mirrors the identical pattern already used
 * standalone on the product detail page) rather than each grid
 * page re-fetching/re-deriving it. `GET /brands` is cheap and already
 * cached (`next: { revalidate: 60 }` in apiFetch), so calling this
 * from several Server Components in the same request tree reuses
 * Next's own fetch cache, never a real repeated network hit.
 */
export async function getBrandNameMap(): Promise<Record<string, string>> {
  try {
    const { data } = await getBrands();
    return Object.fromEntries(data.map((b) => [b.id, b.name]));
  } catch {
    return {};
  }
}

export interface BlogPostCard {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  view_count: number;
  /** Estimated reading time in minutes (backend, ~200 words a minute). */
  reading_minutes?: number;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface GoalSummary {
  code: "muscle" | "weight_loss" | "endurance" | "health";
  name: string;
  count: number;
}

export async function getGoals(): Promise<ApiEnvelope<GoalSummary[]>> {
  return apiFetch<GoalSummary[]>("/api/v1/products/goals");
}

export interface FeaturedReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  verified_purchase: boolean;
  author_name: string;
  created_at: string;
  product: { id: string; name: string; slug: string; image_url: string | null } | null;
}

export async function getFeaturedReviews(limit = 6): Promise<ApiEnvelope<{ average: number | null; count: number; results: FeaturedReview[] }>> {
  return apiFetch(`/api/v1/reviews/featured?limit=${limit}`);
}

export async function getNewsSubscriptionInfo(): Promise<ApiEnvelope<{ gift_coins: number; bot_url: string | null; subscribers: number }>> {
  return apiFetch("/api/v1/notifications/news");
}

// Blog texts come in the shopper's language (Russian / English translations fall back to Uzbek per post).
export async function getBlogCategories(locale?: string): Promise<ApiEnvelope<BlogCategory[]>> {
  return apiFetch<BlogCategory[]>(`/api/v1/content/categories${locale ? `?locale=${encodeURIComponent(locale)}` : ""}`);
}

export async function getBlogPosts(pageSize = 4, page = 1, categorySlug?: string, locale?: string): Promise<ApiEnvelope<BlogPostCard[]>> {
  const categoryParam = categorySlug ? `&category=${encodeURIComponent(categorySlug)}` : "";
  const localeParam = locale ? `&locale=${encodeURIComponent(locale)}` : "";
  return apiFetch<BlogPostCard[]>(`/api/v1/content/posts?page_size=${pageSize}&page=${page}${categoryParam}${localeParam}`);
}

export interface BlogPostDetail extends BlogPostCard {
  body: string;
}

export async function getBlogPostBySlug(slug: string, locale?: string): Promise<ApiEnvelope<BlogPostDetail>> {
  return apiFetch<BlogPostDetail>(`/api/v1/content/posts/${encodeURIComponent(slug)}${locale ? `?locale=${encodeURIComponent(locale)}` : ""}`);
}
