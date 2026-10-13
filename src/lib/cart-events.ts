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
