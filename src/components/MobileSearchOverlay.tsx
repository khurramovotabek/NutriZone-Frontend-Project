"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchOverlay } from "@/components/SearchOverlayContext";

/**
 * Mobile header search trigger -- the small icon button in the mobile
 * nav row, unchanged in appearance/position. Opens the exact same
 * shared GlobalSearchOverlay the desktop SearchBar opens (see that
 * component's own docstring), which renders full-screen on this
 * breakpoint. This file keeps its original name/export so no other
 * file needs to change its import, even though it's now a trigger
 * rather than the overlay itself -- the previous bespoke full-screen
 * search UI that used to live here has moved into GlobalSearchOverlay,
 * shared with desktop instead of duplicated.
 */
export default function MobileSearchOverlay() {
  const t = useTranslations("search");
  const { openSearch } = useSearchOverlay();

  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label={t("openSearch")}
      className="nz-glass flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:text-primary"
    >
      <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
