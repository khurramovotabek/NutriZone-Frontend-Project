/**
 * Real, closed gap: `CartBadge` only ever re-fetched its count when
 * `pathname` changed (see its own `useEffect` dependency array) --
 * `router.refresh()`, which every cart-mutating component already calls,
 * re-fetches Server Component data but never touches this Client
 * Component's own independent `useEffect`-driven fetch, so adding/
 * removing an item without navigating away (e.g. a catalog-card quick-add,
 * or a quantity change on the Cart page itself) left the header badge
 * showing a stale count until the next real navigation. A plain
 * `CustomEvent` is the smallest fix that doesn't require a new state
 * library or prop-drilling through every layout between a cart mutation
 * and the header -- every cart-mutating call site below fires this event
 * immediately after a server-confirmed success, and `CartBadge` is the
 * only listener.
 */
const CART_UPDATED_EVENT = "nutrizone:cart-updated";

export function emitCartUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function onCartUpdated(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CART_UPDATED_EVENT, handler);
  return () => window.removeEventListener(CART_UPDATED_EVENT, handler);
}

type CartBody = { success?: boolean; data?: { items?: { quantity: number; status: string; price_reference?: { unit_amount: string } | null }[] } } | null;

let inFlight: { at: number; promise: Promise<CartBody> } | null = null;
const SHARE_MS = 1500;

/**
 * `GET /api/cart`, shared: the header renders a cart badge for phones and one for desktop (and the Mini App its tab
 * bar), all mounting at once -- they get one request between them instead of one each (each request may cost the
 * API a cart lookup plus a cart creation). A call made after a cart change (`fresh`) never reuses an older answer.
 */
export function loadCart(fresh = false): Promise<CartBody> {
  const now = Date.now();
  if (!fresh && inFlight && now - inFlight.at < SHARE_MS) return inFlight.promise;
  const promise = fetch("/api/cart")
    .then((res) => (res.ok ? (res.json() as Promise<CartBody>) : null))
    .catch(() => null);
  inFlight = { at: now, promise };
  return promise;
}
