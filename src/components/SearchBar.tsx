"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchOverlay } from "@/components/SearchOverlayContext";

/**
 * Desktop header search trigger -- a real, always-visible pill in the
 * nav row (never a hidden icon that has to be clicked first), the same
 * familiar look as the old inline input. Deliberately a real <button>
 * rather than a focusable text input: opening the shared
 * GlobalSearchOverlay (see that component's own docstring) on *focus*
 * would create a real bug -- closing the overlay restores focus to
 * this trigger (SearchOverlayContext's own accessibility requirement),
 * and an input that reopens on focus would immediately reopen itself
 * the instant that restoration ran, making the overlay impossible to
 * close from here. A button only opens on an explicit click/Enter/Space,
 * never merely on regaining focus, so restoring focus here after close
 * is always safe.
 */
export default function SearchBar() {
  const t = useTranslations("search");
  const { openSearch } = useSearchOverlay();

  return (
    <button
      type="button"
      onClick={openSearch}
      className="nz-glass-input flex w-56 min-w-40 shrink items-center gap-2 rounded-full py-2 pl-3 pr-3 text-left text-sm text-ink-soft transition-all duration-200 ease-out hover:brightness-95"
    >
      <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span className="truncate">{t("searchLabel")}</span>
    </button>
  );
}
