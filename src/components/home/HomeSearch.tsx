"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchOverlay } from "@/components/SearchOverlayContext";

/**
 * The first thing on the home page on phones (99% of visitors): a full-width search field -- the fastest way to the
 * product someone came for. A button that opens the shared GlobalSearchOverlay (same reason as SearchBar: a focus-
 * opened input would reopen itself when the overlay restores focus on close). Desktop has the header pill instead.
 */
export default function HomeSearch() {
  const t = useTranslations("home.search");
  const { openSearch } = useSearchOverlay();

  return (
    <div className="mb-4 lg:hidden">
      <button
        type="button"
        onClick={openSearch}
        className="nz-glass-input flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-[15px] text-ink-soft shadow-sm transition active:scale-[0.99]"
      >
        <Search className="h-5 w-5 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{t("placeholder")}</span>
      </button>
      <p className="mt-1.5 px-1 text-xs text-ink-soft">{t("hint")}</p>
    </div>
  );
}
