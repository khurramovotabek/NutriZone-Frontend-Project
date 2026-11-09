"use client";

import { useCallback, useRef, useState } from "react";
import type { ProductCard as ProductCardData } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import LoadMore from "@/components/LoadMore";
import CatalogPagerView from "@/components/CatalogPagerView";

/**
 * A catalogue result list that grows: the server renders page `page`; "show more" appends the following pages in
 * place (the same filters and sort, through the same-origin /api/catalog proxy) and the numbered pagination below
 * marks every page now on screen, so a shopper can keep scrolling or jump to an exact page.
 *
 * `query` is the backend search query string without `page` (built on the server with searchQueryString), `hrefs`
 * every page's own URL, `brandNames` id -> name for the cards.
 */
export default function CatalogFeed({
  initial,
  view,
  query,
  page,
  totalPages,
  totalCount,
  pageSize,
  hrefs,
  brandNames,
  label,
}: {
  initial: ProductCardData[];
  view: "grid" | "list";
  query: string;
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hrefs: string[];
  brandNames: Record<string, string>;
  label: string;
}) {
  const [products, setProducts] = useState(initial);
  const [lastPage, setLastPage] = useState(page);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);

  // a new search / filter / page arrives as new props: start over from them
  const key = `${query}|${page}`;
  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) {
    setSeenKey(key);
    setProducts(initial);
    setLastPage(page);
    setError(false);
  }

  const more = useCallback(async () => {
    if (busy.current || lastPage >= totalPages) return;
    busy.current = true;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/catalog/products/search?${query}&page=${lastPage + 1}`);
      const body = await res.json();
      if (!res.ok || !body?.success) throw new Error("load failed");
      const next: ProductCardData[] = body.data ?? [];
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...next.filter((p) => !seen.has(p.id))];
      });
      setLastPage((n) => n + 1);
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [lastPage, query, totalPages]);

  const cards = products.map((product, idx) => (
    <ProductCard
      key={product.id}
      product={product}
      brandName={product.brand_id ? (brandNames[product.brand_id] ?? null) : null}
      priority={idx < 4}
      {...(view === "list" ? { layout: "list" as const } : {})}
    />
  ));
  const shown = Math.min(totalCount, (page - 1) * pageSize + products.length);

  return (
    <>
      {view === "grid" ? <ProductGrid>{cards}</ProductGrid> : <div className="flex flex-col gap-3">{cards}</div>}
      <LoadMore
        className="mt-10"
        auto={false}
        hasMore={lastPage < totalPages}
        loading={loading}
        error={error}
        onMore={more}
        shown={shown}
        total={totalCount}
      />
      <CatalogPagerView className="mt-8" page={page} lastPage={lastPage} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} hrefs={hrefs} label={label} />
    </>
  );
}
