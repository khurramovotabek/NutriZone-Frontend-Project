"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface WishlistValue {
  /** `null` until the one, real client-side fetch below resolves -- callers fall back to their own server-rendered default while this is null, never flashing a false "not wishlisted" state. */
  ids: Set<string> | null;
  isWishlisted: (productId: string) => boolean | null;
  setWishlisted: (productId: string, wishlisted: boolean) => void;
}

const WishlistCtx = createContext<WishlistValue | null>(null);

/**
 * Real, closed gap: every ProductCard grid except the Wishlist page
 * itself and the Product Detail page always rendered with
 * `initialWishlisted` defaulted to `false` -- a genuinely already-liked
 * product's heart showed empty everywhere else (Home, Products,
 * Category, Brand, Related Products), because those pages are
 * `revalidate`-cached, shared server HTML that must never bake one
 * visitor's private wishlist into a response other visitors also
 * receive. Fetching the real wishlist once, client-side, after
 * mount -- exactly like SearchOverlayProvider's own "one shared client
 * state, mounted once in the storefront layout" pattern -- fixes this
 * everywhere at once without touching any page's caching.
 *
 * A guest visitor (no session) simply gets a 401 from `/api/wishlist`,
 * treated the same as an empty wishlist -- never surfaced as an error.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wishlist")
      .then((res) => (res.ok ? res.json() : { success: false, data: [] }))
      .then((body) => {
        if (cancelled) return;
        const items: { id: string }[] = body.success ? body.data : [];
        setIds(new Set(items.map((item) => item.id)));
      })
      .catch(() => {
        if (!cancelled) setIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isWishlisted = useCallback((productId: string) => (ids ? ids.has(productId) : null), [ids]);

  const setWishlisted = useCallback((productId: string, wishlisted: boolean) => {
    setIds((prev) => {
      const next = new Set(prev ?? []);
      if (wishlisted) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  return <WishlistCtx.Provider value={{ ids, isWishlisted, setWishlisted }}>{children}</WishlistCtx.Provider>;
}

/** Never throws when used outside the provider (e.g. an isolated unit test rendering WishlistButton alone) -- callers just see "unknown yet" and keep their own default. */
export function useWishlist(): WishlistValue | null {
  return useContext(WishlistCtx);
}
