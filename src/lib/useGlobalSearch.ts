"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import type { Category, GoalSummary, ProductCard as ProductCardData } from "@/lib/api";
import { getBrandNameMapClient, getCategoriesClient, getGoalsClient, getPopularSearchesClient, searchProductsClient } from "@/lib/catalog-client";

const DEBOUNCE_MS = 300;
// A concise preview, never "hundreds of products" -- the overlay's own
// "View all (N)" link is the real path to the full, paginated result
// set on /products.
const RESULT_PREVIEW_LIMIT = 8;
const CATEGORY_MATCH_LIMIT = 5;
const BRAND_MATCH_LIMIT = 5;
const RECENT_SEARCHES_KEY = "nz_recent_searches";
const MAX_RECENT_SEARCHES = 5;

function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(term: string) {
  try {
    const existing = readRecentSearches().filter((s) => s.toLowerCase() !== term.toLowerCase());
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([term, ...existing].slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // Best-effort convenience only -- never blocks search itself.
  }
}

export interface BrandMatch {
  id: string;
  name: string;
}

export interface GoalMatch {
  id: string;
  name: string;
  count: number;
}

type SearchResult = {
  key: string;
  products: ProductCardData[];
  brands: BrandMatch[];
  /** Query-scoped category / goal facets from the smart search (understands Cyrillic, typos, synonyms). */
  facetCategories: { id: string; name: string }[];
  goals: GoalMatch[];
  totalCount: number;
  suggestion: string | null;
  error: boolean;
};

/**
 * The one, shared implementation behind the global search overlay
 * (GlobalSearchOverlay) -- same debounce, same real endpoint, same
 * keyboard-navigation index, so there is exactly one search behavior
 * on this whole site, never a second one silently drifting apart.
 *
 * Products: the real, already-production-grade full-text search
 * (`GET /products/search` via lib/api.ts's searchProducts()), capped
 * at `RESULT_PREVIEW_LIMIT` -- `totalCount` is the real, separate
 * `pagination.total_count` from that same response, for "View all (N)".
 *
 * Brand names on those product cards: the same `getBrandNameMap()`
 * every other product grid on the site already uses (id -> name), since
 * the card shape itself only ever carries `brand_id`.
 *
 * Brands (the dedicated "Brands" suggestion list): the SAME response's
 * own `meta.facets.brand` -- real, query-scoped brand matches computed
 * server-side from the actual matching products (confirmed directly
 * against a live response), not a client invention and not the
 * unfiltered brand list.
 *
 * Categories: `GET /categories` has no query-filter capability at all
 * (confirmed directly -- no such parameter exists), so this is an
 * honest client-side "category name contains the search term" match
 * over the real category list, fetched once and cached for the
 * component's lifetime -- never a fabricated category.
 */
export function useGlobalSearch() {
  const locale = useLocale();

  const [query, setQuery] = useState("");
  // Only ever mounted client-side, after the overlay first opens (see
  // GlobalSearchOverlay's lazy-mount wrapper) -- safe to read storage here.
  const [recent, setRecent] = useState<string[]>(readRecentSearches);
  const [activeIndex, setActiveIndex] = useState(-1);
  // The latest response, tagged with the search it answers. Everything
  // shown (results, error, loading) is derived from whether it matches
  // the current query, so typing never needs an effect to reset state.
  const [result, setResult] = useState<SearchResult | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [brandNames, setBrandNames] = useState<Record<string, string>>({});
  // The empty state's shortcuts: what other shoppers search for, and the training goals.
  const [popular, setPopular] = useState<string[]>([]);
  const [allGoals, setAllGoals] = useState<GoalSummary[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    getCategoriesClient(locale)
      .then((res) => setAllCategories(res.data))
      .catch(() => setAllCategories([]));
    getPopularSearchesClient(8)
      .then((res) => setPopular(res.data))
      .catch(() => setPopular([]));
    getGoalsClient()
      .then((res) => setAllGoals(res.data.filter((g) => g.count > 0)))
      .catch(() => setAllGoals([]));
    // Same id->name lookup every product grid on the site already uses
    // (getBrandNameMap's own docstring) -- the search result cards need
    // it too, since `ProductCard` never carries a resolved brand name,
    // only `brand_id`.
    getBrandNameMapClient().then(setBrandNames);
  }, [locale]);

  const trimmedQuery = query.trim();
  const searchKey = trimmedQuery.length >= 2 ? `${locale}:${trimmedQuery}` : null;
  const current = searchKey && result?.key === searchKey ? result : null;
  const products = current?.products ?? [];
  const brands = current?.brands ?? [];
  const goals = current?.goals ?? [];
  const totalCount = current?.totalCount ?? 0;
  const suggestion = current?.suggestion ?? null;
  const error = current?.error ?? false;
  // Loading turns on immediately (real, honest feedback that a search
  // is now pending), the actual request itself waits out the debounce.
  const loading = searchKey !== null && current === null;

  // A new query always starts keyboard selection from the input again.
  const [indexQuery, setIndexQuery] = useState(searchKey);
  if (indexQuery !== searchKey) {
    setIndexQuery(searchKey);
    setActiveIndex(-1);
  }

  // Categories the matching products are in (smart, server-side), then any whose own name contains what was typed.
  const facetCategories = current?.facetCategories;
  const categories = useMemo(() => {
    if (trimmedQuery.length < 2) return [];
    const needle = trimmedQuery.toLowerCase();
    const byName = allCategories.filter((c) => c.name.toLowerCase().includes(needle));
    const merged = new Map<string, { id: string; name: string }>();
    for (const c of [...(facetCategories ?? []), ...byName]) if (!merged.has(c.id)) merged.set(c.id, { id: c.id, name: c.name });
    return [...merged.values()].slice(0, CATEGORY_MATCH_LIMIT);
  }, [allCategories, facetCategories, trimmedQuery]);

  // Shared by the debounced effect below and `retry()` (the error
  // state's "Try again" button) -- one real fetch path, not two.
  const runSearch = useCallback(
    (q: string) => {
      const key = `${locale}:${q}`;
      const thisRequestId = ++requestIdRef.current;
      searchProductsClient({ q, pageSize: RESULT_PREVIEW_LIMIT, locale })
        .then((res) => {
          if (requestIdRef.current !== thisRequestId) return; // a newer keystroke (or retry) already superseded this request
          setResult({
            key,
            products: res.data,
            brands: (res.meta.facets?.brand ?? []).slice(0, BRAND_MATCH_LIMIT),
            facetCategories: (res.meta.facets?.category ?? []).filter((c) => c.count > 0),
            goals: (res.meta.facets?.goal ?? []).filter((g) => g.count > 0),
            totalCount: res.pagination?.total_count ?? res.data.length,
            suggestion: res.meta.suggestion ?? null,
            error: false,
          });
        })
        .catch(() => {
          if (requestIdRef.current !== thisRequestId) return;
          setResult({ key, products: [], brands: [], facetCategories: [], goals: [], totalCount: 0, suggestion: null, error: true });
        });
    },
    [locale],
  );

  function retry() {
    if (trimmedQuery.length < 2) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setResult(null); // back to the loading state
    runSearch(trimmedQuery);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trimmedQuery.length < 2) return;
    debounceRef.current = setTimeout(() => runSearch(trimmedQuery), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmedQuery, runSearch]);

  const resultCount = products.length; // keyboard nav only ever moves through the Products list -- Categories/Brands are click-only, matching this dropdown's own visual reading order.
  const showRecent = trimmedQuery.length === 0 && recent.length > 0;
  const showTypeMoreHint = trimmedQuery.length > 0 && trimmedQuery.length < 2;
  const showEmpty = !loading && !error && trimmedQuery.length >= 2 && products.length === 0 && categories.length === 0 && brands.length === 0 && goals.length === 0;
  const showNoProductResults = !loading && !error && trimmedQuery.length >= 2 && products.length === 0;

  function refreshRecent() {
    setRecent(readRecentSearches());
  }

  return {
    query,
    setQuery,
    trimmedQuery,
    products,
    categories,
    brands,
    goals,
    popular,
    allGoals,
    loading,
    error,
    recent,
    refreshRecent,
    activeIndex,
    setActiveIndex,
    resultCount,
    showRecent,
    showTypeMoreHint,
    showEmpty,
    showNoProductResults,
    allCategories,
    brandNames,
    totalCount,
    suggestion,
    retry,
  };
}
