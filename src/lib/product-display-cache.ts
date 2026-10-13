/**
 * Real, confirmed backend gap (see CartItem/OrderLine in cart-api.ts /
 * orders-api.ts): the Cart and Order APIs identify a line only by
 * `product_variant_id` -- no name, image, brand, or flavor/size label
 * is ever returned by either. There is also no public "resolve a
 * product by variant id" endpoint to backfill it from cart/checkout.
 *
 * The one place this data genuinely exists client-side is at the
 * moment a shopper actually SEES a product -- a catalog card render or
 * a product detail page view -- where the real `ProductCard` API
 * response already carries name/image/brand/variant attributes. This
 * module opportunistically remembers that real data, keyed by variant
 * id, purely so Cart/Checkout/Order screens can show a real photo and
 * name instead of a bare id. `displayPrice` is the catalog price the
 * shopper actually saw -- shown ONLY as a labelled estimate for a guest
 * cart line that the server hasn't priced yet (pricing needs a signed-in
 * customer). The server's own `price_reference`/`unit_price` stays the
 * sole financial authority; the estimate is never sent anywhere and is
 * never shown once a real price exists. It never invents a name/image for a variant it hasn't
 * actually seen -- callers must fall back to a generic icon + short id
 * on a cache miss (e.g. cart shared across devices/browsers).
 */
"use client";

export interface CachedVariantDisplay {
  variantId: string;
  productSlug: string;
  productName: string;
  brandName: string | null;
  image: string | null;
  /** e.g. "2.27 kg · Chocolate" -- joined from real attributes/weight, never fabricated. */
  variantLabel: string | null;
  /** Catalog price as displayed at view time -- guest-cart estimate only, never authoritative. */
  displayPrice?: string | null;
  displayCurrency?: string | null;
  cachedAt: number;
}

const STORAGE_KEY = "nz_product_display_cache_v1";
const MAX_ENTRIES = 300;

type CacheShape = Record<string, CachedVariantDisplay>;

function readCache(): CacheShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CacheShape) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: CacheShape): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Object.entries(cache);
    const trimmed = entries.length > MAX_ENTRIES ? Object.fromEntries(entries.sort((a, b) => b[1].cachedAt - a[1].cachedAt).slice(0, MAX_ENTRIES)) : cache;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Private browsing / storage quota -- display enrichment is a nice-to-have, never worth surfacing an error for.
  }
}

export function cacheVariantDisplays(entries: CachedVariantDisplay[]): void {
  if (entries.length === 0) return;
  const cache = readCache();
  for (const entry of entries) cache[entry.variantId] = entry;
  writeCache(cache);
}

export function getCachedVariantDisplay(variantId: string): CachedVariantDisplay | null {
  return readCache()[variantId] ?? null;
}
