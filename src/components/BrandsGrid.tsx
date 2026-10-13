"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Brand } from "@/lib/api";
import BrandCard from "@/components/BrandCard";
import BrandGrid from "@/components/BrandGrid";

type BrandSort = "az" | "most";

/**
 * Brand directory with instant search and sorting. `GET /brands` returns
 * every active brand in one response (no pagination), so filtering and
 * sorting the already-fetched list client-side is the right call.
 */
export default function BrandsGrid({ brands }: { brands: Brand[] }) {
  const t = useTranslations("brands");
  const tCatalog = useTranslations("catalog");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<BrandSort>("az");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle ? brands.filter((b) => b.name.toLowerCase().includes(needle) || (b.description ?? "").toLowerCase().includes(needle)) : brands;
    return [...filtered].sort((a, b) => (sort === "most" ? (b.product_count ?? 0) - (a.product_count ?? 0) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)));
  }, [brands, query, sort]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={1.9} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="nz-glass-input w-full rounded-2xl py-3 pl-10 pr-10 text-sm"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label={tCatalog("clearSearch")} className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-ink-soft transition-colors hover:text-ink">
              <X className="h-4 w-4" strokeWidth={1.9} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 sm:ml-auto">
          <p className="text-sm text-ink-muted">{t("brandCount", { count: visible.length })}</p>
          <div role="radiogroup" aria-label={t("sortLabel")} className="nz-glass flex gap-1 rounded-2xl p-1">
            {(["az", "most"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={sort === s}
                onClick={() => setSort(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${sort === s ? "bg-primary text-white" : "text-ink-muted hover:text-ink"}`}
              >
                {s === "az" ? t("sortAz") : t("sortMost")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {visible.length === 0 ? (
          <p className="py-10 text-center text-ink-muted">{t("noSearchResults", { query })}</p>
        ) : (
          <BrandGrid>
            {visible.map((brand, idx) => (
              <BrandCard key={brand.id} brand={brand} priority={idx < 4} />
            ))}
          </BrandGrid>
        )}
      </div>
    </div>
  );
}
