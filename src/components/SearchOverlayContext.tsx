"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface SearchOverlayValue {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const SearchOverlayCtx = createContext<SearchOverlayValue | null>(null);

/**
 * Shared open/close state for the ONE global search overlay
 * (GlobalSearchOverlay, mounted once in the storefront layout), so
 * both real header triggers -- the desktop inline search field and
 * the mobile search icon button, two separate components living in
 * two different places in the header per this app's own established
 * per-breakpoint-control convention (see SearchBar's own docstring) --
 * open the exact same dialog instead of each owning a second,
 * independent search surface.
 *
 * Also owns focus restoration: captures whichever element had focus
 * right before `openSearch()` (the real trigger, desktop or mobile,
 * whichever was actually used) and returns focus to it on close, per
 * the accessibility requirement that closing a dialog never strands
 * keyboard focus.
 */
export function SearchOverlayProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const openSearch = useCallback(() => {
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setOpen(false);
    lastFocusedRef.current?.focus();
  }, []);

  return <SearchOverlayCtx.Provider value={{ open, openSearch, closeSearch }}>{children}</SearchOverlayCtx.Provider>;
}

export function useSearchOverlay(): SearchOverlayValue {
  const ctx = useContext(SearchOverlayCtx);
  if (!ctx) throw new Error("useSearchOverlay must be used within SearchOverlayProvider");
  return ctx;
}
