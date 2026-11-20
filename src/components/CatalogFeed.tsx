"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, CheckCircle2, ChevronDown, Loader2, RotateCw } from "lucide-react";
import type { ProductCard as ProductCardData } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import CatalogPagerView from "@/components/CatalogPagerView";

/**
 * A catalogue result list that grows: the server renders page `page`; "show 24 more" appends the following pages in
 * place (the same filters and sort, through the same-origin /api/catalog proxy) and the numbered pagination below
 * marks every page now on screen, so a shopper can keep scrolling or jump to an exact page.
 *
 * One footer for all of it: a progress line with "1–48 / 1 211", the big "show more" button (skeleton cards hold the
 * place of the page being loaded), then the page numbers. After the first tap the next pages load by themselves as
 * the shopper nears the end (infinite scroll, the way phone users expect a feed to behave); a floating "to top"
 * button appears once the list has grown long.
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
  const t = useTranslations("pagination");
  const tl = useTranslations("common.list");
  const [products, setProducts] = useState(initial);
  const [lastPage, setLastPage] = useState(page);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [auto, setAuto] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // a new search / filter / page arrives as new props: start over from them
  const key = `${query}|${page}`;
  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) {
    setSeenKey(key);
    setProducts(initial);
    setLastPage(page);
    setError(false);
    setAuto(false);
  }

  const hasMore = lastPage < totalPages;
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
      setAuto(false);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [lastPage, query, totalPages]);

  // infinite scroll -- only once the shopper has asked for more by hand (the footer and page numbers stay reachable)
  const moreRef = useRef(more);
  useEffect(() => {
    moreRef.current = more;
  }, [more]);
  useEffect(() => {
    const el = sentinel.current;
    if (!auto || !el || !hasMore || loading || error || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) moreRef.current();
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [auto, hasMore, loading, error]);

  const cards = products.map((product, idx) => (
    <ProductCard
      key={product.id}
      product={product}
      brandName={product.brand_id ? (brandNames[product.brand_id] ?? null) : null}
      priority={idx < 4}
      {...(view === "list" ? { layout: "list" as const } : {})}
    />
  ));
  const first = (page - 1) * pageSize + 1;
  const shown = Math.min(totalCount, (page - 1) * pageSize + products.length);
  const remaining = Math.max(0, totalCount - shown);
  const nextBatch = Math.min(pageSize, remaining);
  const percent = totalCount ? Math.max(2, Math.min(100, Math.round((shown / totalCount) * 100))) : 100;
  const skeletons = loading
    ? Array.from({ length: view === "grid" ? Math.min(nextBatch, 8) : Math.min(nextBatch, 3) }, (_, i) =>
        view === "grid" ? <ProductCardSkeleton key={`sk-${i}`} /> : <div key={`sk-${i}`} className="h-[104px] animate-pulse rounded-2xl bg-surface-3" aria-hidden="true" />,
      )
    : [];

  return (
    <>
      {view === "grid" ? (
        <ProductGrid>
          {cards}
          {skeletons}
        </ProductGrid>
      ) : (
        <div className="flex flex-col gap-3">
          {cards}
          {skeletons}
        </div>
      )}

      {totalPages > 1 && (
        <section ref={sentinel} aria-label={label} className="nz-glass mx-auto mt-10 w-full max-w-2xl rounded-3xl p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3 text-xs font-medium text-ink-muted" aria-live="polite">
            <span className="tabular-nums">
              <b className="text-sm font-bold text-ink">{first > 1 ? `${first.toLocaleString("ru-RU")}–` : ""}{shown.toLocaleString("ru-RU")}</b> / {totalCount.toLocaleString("ru-RU")} {t("products")}
            </span>
            <span className="tabular-nums">{percent}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={tl("shown", { shown, total: totalCount })}>
            <div className="nz-progress-fill h-full rounded-full bg-gradient-to-r from-primary to-sky-400 !shadow-[0_0_12px_rgba(37,99,235,0.45)]" style={{ width: `${percent}%` }} />
          </div>

          <div className="mt-4 flex flex-col items-center gap-2">
            {hasMore ? (
              error ? (
                <button type="button" onClick={more} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 px-6 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400">
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  {tl("error")} · {tl("retry")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuto(true);
                    void more();
                  }}
                  disabled={loading}
                  aria-busy={loading}
                  className="nz-cta group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold transition-transform active:scale-[0.98] disabled:opacity-80 sm:w-auto sm:min-w-72"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />}
                  {loading ? tl("loading") : t("moreCount", { count: nextBatch })}
                </button>
              )
            ) : (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {first > 1 ? t("endOfList") : `${tl("allShown")} · ${totalCount.toLocaleString("ru-RU")}`}
              </p>
            )}
            {hasMore && !error && <p className="text-[11px] text-ink-soft">{t("remaining", { count: remaining })}</p>}
          </div>

          <CatalogPagerView bare className="mt-4 border-t border-border/60 pt-4" page={page} lastPage={lastPage} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} hrefs={hrefs} label={label} />
        </section>
      )}
      <ToTop show={lastPage > page || shown > 24} label={t("toTop")} />
    </>
  );
}

/** Floating "to top" once the grown list is long: a glass pill on desktop, a round icon above the tab bar on phones. */
function ToTop({ show, label }: { show: boolean; label: string }) {
  const [far, setFar] = useState(false);
  useEffect(() => {
    if (!show) return;
    const sync = () => setFar(window.scrollY > 1400);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, [show]);
  if (!show || !far) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={label}
      className="nz-glass-strong fixed bottom-24 right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-ink shadow-lg transition-transform hover:-translate-y-0.5 lg:bottom-8 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:px-4"
    >
      <ArrowUp className="h-4 w-4 text-primary" aria-hidden="true" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
