"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Brand } from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";
import { brandPath } from "@/lib/entity-paths";

type BrandSort = "az" | "most";

const TOP = 8;
const letterOf = (name: string) => {
  const ch = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "#";
};

/**
 * Brand directory: the most-stocked brands first as large tiles, then every brand as a compact logo tile grouped by
 * its first letter with an A–Z jump bar (105 brands as tall cards made a 15 000 px phone page). Instant search and
 * the "most products" order flatten the groups. `GET /brands` returns every active brand in one response, so all of
 * it runs on the already-fetched list.
 */
export default function BrandsGrid({ brands }: { brands: Brand[] }) {
  const t = useTranslations("brands");
  const tCatalog = useTranslations("catalog");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<BrandSort>("az");

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const filtered = needle ? brands.filter((b) => b.name.toLowerCase().includes(needle) || (b.description ?? "").toLowerCase().includes(needle)) : brands;
    return [...filtered].sort((a, b) => (sort === "most" ? (b.product_count ?? 0) - (a.product_count ?? 0) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)));
  }, [brands, needle, sort]);
  const top = useMemo(() => [...brands].sort((a, b) => (b.product_count ?? 0) - (a.product_count ?? 0)).filter((b) => (b.product_count ?? 0) > 0).slice(0, TOP), [brands]);

  const grouped = sort === "az" && !needle;
  const groups = useMemo(() => {
    const out = new Map<string, Brand[]>();
    for (const b of visible) {
      const k = letterOf(b.name);
      out.set(k, [...(out.get(k) ?? []), b]);
    }
    return [...out.entries()];
  }, [visible]);

  const jump = (letter: string) => document.getElementById(`brands-${letter}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div>
      {top.length >= 4 && !needle && (
        <section aria-labelledby="brands-top" className="mb-10">
          <h2 id="brands-top" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink sm:text-xl">
            <Flame className="h-5 w-5 text-orange-500" aria-hidden="true" />
            {t("topTitle")}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {top.map((b, i) => (
              <li key={b.id}>
                <Link href={brandPath(b)} className="nz-glass nz-glass-interactive group flex h-full flex-col overflow-hidden rounded-2xl">
                  <span className="relative block aspect-[16/9] overflow-hidden border-b border-border/60">
                    <span className="block h-full w-full transition-transform duration-500 group-hover:scale-[1.05]">
                      <BrandLogo name={b.name} logoUrl={b.logo_url} padding="p-4 sm:p-6" textSize="text-3xl" sizes="(max-width: 640px) 50vw, 300px" loading={i < 4 ? "eager" : "lazy"} />
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink group-hover:text-primary">{b.name}</span>
                      <span className="block text-[11px] font-medium text-ink-soft">{t("productCount", { count: b.product_count ?? 0 })}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft transition-all group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* the toolbar stays under the site header while the long list scrolls */}
      <div className="nz-glass sticky top-[calc(env(safe-area-inset-top)+64px)] z-20 -mx-4 rounded-none border-x-0 px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border-x sm:px-4 lg:top-[84px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={1.9} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="nz-glass-input w-full rounded-xl py-2.5 pl-10 pr-10 text-sm"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label={tCatalog("clearSearch")} className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-ink-soft transition-colors hover:text-ink">
                <X className="h-4 w-4" strokeWidth={1.9} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 sm:ml-auto">
            <p className="text-sm text-ink-muted">{t("brandCount", { count: visible.length })}</p>
            <div role="radiogroup" aria-label={t("sortLabel")} className="flex gap-1 rounded-xl bg-surface-2/70 p-1">
              {(["az", "most"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={sort === s}
                  onClick={() => setSort(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${sort === s ? "bg-primary text-white shadow" : "text-ink-muted hover:text-ink"}`}
                >
                  {s === "az" ? t("sortAz") : t("sortMost")}
                </button>
              ))}
            </div>
          </div>
        </div>
        {grouped && groups.length > 1 && (
          <nav aria-label={t("jumpLabel")} className="scrollbar-none -mx-4 mt-3 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            {groups.map(([letter, list]) => (
              <button
                key={letter}
                type="button"
                onClick={() => jump(letter)}
                title={t("brandCount", { count: list.length })}
                className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-bold text-ink-muted transition-colors hover:bg-primary hover:text-white"
              >
                {letter}
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="mt-6">
        {visible.length === 0 ? (
          <p className="py-10 text-center text-ink-muted">{t("noSearchResults", { query })}</p>
        ) : grouped ? (
          <div className="space-y-8">
            {groups.map(([letter, list]) => (
              <section key={letter} id={`brands-${letter}`} aria-label={letter} className="scroll-mt-[200px] lg:scroll-mt-[180px]">
                <h3 className="mb-3 flex items-center gap-3 text-xl font-extrabold text-ink">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">{letter}</span>
                  <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
                  <span className="text-xs font-medium text-ink-soft">{t("brandCount", { count: list.length })}</span>
                </h3>
                <BrandTiles brands={list} />
              </section>
            ))}
          </div>
        ) : (
          <BrandTiles brands={visible} />
        )}
      </div>
    </div>
  );
}

/** Compact logo tiles: three across on phones, six on desktop -- logo, name, product count. */
function BrandTiles({ brands }: { brands: Brand[] }) {
  const t = useTranslations("brands");
  return (
    <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
      {brands.map((b) => (
        <li key={b.id}>
          <Link href={brandPath(b)} className="nz-glass nz-glass-interactive group flex h-full flex-col overflow-hidden rounded-2xl">
            <span className="relative block aspect-[4/3] overflow-hidden border-b border-border/60">
              <span className="block h-full w-full transition-transform duration-500 group-hover:scale-[1.06]">
                <BrandLogo name={b.name} logoUrl={b.logo_url} padding="p-3 sm:p-4" textSize="text-xl" sizes="(max-width: 640px) 33vw, 200px" />
              </span>
            </span>
            <span className="flex flex-1 flex-col px-2 py-2 sm:px-3">
              <span className="line-clamp-2 text-xs font-bold leading-tight text-ink group-hover:text-primary sm:text-[13px]">{b.name}</span>
              {b.product_count != null && <span className="mt-auto pt-1 text-[10px] font-medium text-ink-soft sm:text-[11px]">{t("productCount", { count: b.product_count })}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
