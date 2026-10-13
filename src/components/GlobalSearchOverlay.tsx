"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, AlertCircle, Clock, Dumbbell, Flame, HeartPulse, Loader2, Search, SearchX, Sparkles, Tag, TrendingUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useGlobalSearch, saveRecentSearch } from "@/lib/useGlobalSearch";
import { useSearchOverlay } from "@/components/SearchOverlayContext";
import ProductCard from "@/components/ProductCard";
import { Button, Skeleton } from "@/components/ui";

const GOAL_STYLE: Record<string, { icon: typeof Dumbbell; tone: string }> = {
  muscle: { icon: Dumbbell, tone: "text-indigo-500 bg-indigo-500/12" },
  weight_loss: { icon: Flame, tone: "text-orange-500 bg-orange-500/12" },
  endurance: { icon: Activity, tone: "text-emerald-500 bg-emerald-500/12" },
  health: { icon: HeartPulse, tone: "text-fuchsia-500 bg-fuchsia-500/12" },
};

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
const SKELETON_ROWS = 4;

/**
 * NutriZone's one, global search experience -- a premium floating
 * overlay (centered glass panel on desktop, full-screen on mobile),
 * mounted ONCE (see (storefront)/layout.tsx) and opened from either
 * real header trigger via SearchOverlayContext. Replaces the previous
 * two separate, "basic" surfaces (SearchBar's own inline dropdown and
 * MobileSearchOverlay's own full-screen list) with a single
 * implementation so both entry points can never again drift apart.
 *
 * Every piece of data here is real: `useGlobalSearch` is the exact
 * same shared hook those two surfaces already used (same debounce,
 * same `GET /products/search`, same stale-request guard, same
 * `meta.facets.brand` for brand matches, same client-side category
 * name-match since `GET /categories` has no query filter of its own).
 * Nothing here is mocked or fabricated -- see the hook's own docstring
 * for exactly what each section is backed by.
 *
 * "Popular Searches" from the reference design is deliberately absent:
 * neither the search endpoint nor any part of this codebase exposes
 * real search-popularity data, and inventing one would be exactly the
 * fake-analytics this project's own rules forbid. "Recent Searches"
 * (real, this visitor's own history, already existing) fills that
 * role honestly instead.
 */
/**
 * Lazy-mount wrapper: `useGlobalSearch()` fetches categories and the
 * brand-name map on mount, so mounting the real dialog unconditionally
 * in the layout (as this component itself is) would fire those two
 * requests on every single storefront page load, whether or not any
 * visitor ever opens search. Mounting the actual content only once the
 * overlay has been opened for the first time -- and keeping it mounted
 * afterward, so a second open doesn't re-fetch or lose scroll/animation
 * state -- keeps those requests real and on-demand instead.
 */
export default function GlobalSearchOverlay() {
  const { open } = useSearchOverlay();
  const [hasOpened, setHasOpened] = useState(false);
  if (open && !hasOpened) setHasOpened(true);

  if (!hasOpened) return null;
  return <GlobalSearchOverlayContent />;
}

function GlobalSearchOverlayContent() {
  const { open, closeSearch } = useSearchOverlay();
  const t = useTranslations("search");
  const tCatalog = useTranslations("catalog");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const search = useGlobalSearch();
  const { query, setQuery, trimmedQuery, activeIndex, setActiveIndex, resultCount, products, brandNames } = search;

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const focusId = setTimeout(() => inputRef.current?.focus(), 30);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    search.refreshRecent();
    return () => {
      clearTimeout(focusId);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per open, not on every render `search`/`refreshRecent` identity changes.
  }, [open]);

  if (!open) return null;

  function handleClose() {
    setQuery("");
    closeSearch();
  }

  function goToResults(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    handleClose();
    router.push(`/products?q=${encodeURIComponent(trimmed)}`);
  }

  function goToProduct(slug: string) {
    if (trimmedQuery) saveRecentSearch(trimmedQuery);
    handleClose();
    router.push(`/products/${slug}`);
  }

  /** Fills the input with a real, previously-searched term and lets the shared debounce/search effect take it from there -- keeps the visitor inside this same workspace instead of bouncing them straight to /products. */
  function fillQuery(term: string) {
    setQuery(term);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(Math.min(activeIndex + 1, resultCount - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(activeIndex - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      if (document.activeElement !== inputRef.current) return; // never hijack Enter pressed on a focused link/button inside the panel
      e.preventDefault();
      if (activeIndex >= 0 && products[activeIndex]) {
        goToProduct(products[activeIndex].slug);
      } else {
        goToResults(query);
      }
      return;
    }
    if (e.key === "Tab" && panelRef.current) {
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  const showBrowseCategories = trimmedQuery.length < 2;
  const categoryList = showBrowseCategories ? search.allCategories : search.categories;

  return (
    <div className="fixed inset-0 z-50">
      <div className="animate-nz-fade-in absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("dialogLabel")}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="animate-nz-catalog-in nz-glass-strong fixed inset-0 z-10 flex flex-col overflow-hidden sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh] sm:w-[calc(100vw-3rem)] sm:max-w-[1100px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Input row */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border p-3 sm:p-4">
          <Search className="h-5 w-5 shrink-0 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchLabel")}
            aria-label={t("searchLabel")}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={products.length > 0}
            aria-controls="global-search-results"
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined}
            className="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-soft focus:outline-none sm:text-lg"
          />
          {search.loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-soft" strokeWidth={2} aria-hidden="true" />}
          {query && !search.loading && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label={tCatalog("clearSearch")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
          <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
          <button
            type="button"
            onClick={handleClose}
            aria-label={tCommon("close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-y-auto sm:flex-row sm:overflow-hidden">
          {/* Left: suggestions / categories */}
          <div className="shrink-0 space-y-6 border-b border-border p-4 sm:w-[30%] sm:overflow-y-auto sm:border-b-0 sm:border-r sm:p-5">
            {search.showRecent && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("recentSearches")}</p>
                <div className="space-y-0.5">
                  {search.recent.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => fillQuery(term)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink-muted transition-colors hover:bg-primary-soft hover:text-primary"
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span className="truncate">{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {categoryList.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{showBrowseCategories ? t("browseCategories") : t("categoriesHeading")}</p>
                <div className="space-y-0.5">
                  {categoryList.map((category) => (
                    <Link
                      key={category.id}
                      href={`/products?category=${category.id}`}
                      onClick={handleClose}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <Tag className="h-3.5 w-3.5 shrink-0 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
                      <span className="truncate">{category.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {search.brands.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("brandsHeading")}</p>
                <div className="space-y-0.5">
                  {search.brands.map((brand) => (
                    <Link
                      key={brand.id}
                      href={`/products?brand=${brand.id}`}
                      onClick={handleClose}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <span className="truncate">{brand.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {search.goals.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("goalsHeading")}</p>
                <div className="space-y-0.5">
                  {search.goals.map((goal) => {
                    const style = GOAL_STYLE[goal.id] ?? GOAL_STYLE.health;
                    const Icon = style.icon;
                    return (
                      <Link
                        key={goal.id}
                        href={`/products?goal=${goal.id}`}
                        onClick={handleClose}
                        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${style.tone.split(" ")[0]}`} strokeWidth={2} aria-hidden="true" />
                        <span className="truncate">{goal.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: real product results */}
          <div className="flex-1 p-4 sm:w-[70%] sm:overflow-y-auto sm:p-5">
            {trimmedQuery.length >= 2 && (
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("productsHeading")}</p>
                {!search.loading && !search.error && products.length > 0 && (
                  <button type="button" onClick={() => goToResults(query)} className="shrink-0 text-sm font-medium text-primary hover:underline">
                    {t("viewAll", { count: search.totalCount })} &rarr;
                  </button>
                )}
              </div>
            )}

            {!search.loading && !search.error && search.suggestion && search.suggestion !== trimmedQuery.toLowerCase() && (
              <p className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-primary-soft/60 px-3 py-2 text-sm text-ink-muted">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
                {t("didYouMean")}
                <button type="button" onClick={() => setQuery(search.suggestion!)} className="font-semibold text-primary hover:underline">
                  {search.suggestion}
                </button>
              </p>
            )}

            {search.loading && (
              <div className="space-y-2" aria-hidden="true">
                {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                  <div key={i} className="nz-glass flex items-center gap-4 rounded-xl p-3">
                    <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!search.loading && search.error && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <AlertCircle className="h-8 w-8 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-sm text-ink-muted">{t("errorMessage")}</p>
                <Button type="button" variant="secondary" onClick={search.retry}>
                  {tCommon("retry")}
                </Button>
              </div>
            )}

            {!search.loading && !search.error && search.showTypeMoreHint && <p className="py-12 text-center text-sm text-ink-soft">{t("typeMore")}</p>}

            {!search.loading && !search.error && search.showNoProductResults && (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <SearchX className="h-9 w-9 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-ink">{t("noResults", { query: trimmedQuery })}</p>
                  <p className="mt-1 text-sm text-ink-muted">{t("noResultsHint")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {tCatalog("clearSearch")}
                </button>

                <div className="mt-2 w-full max-w-xs rounded-2xl border border-border p-4">
                  <p className="text-sm font-semibold text-ink">{t("helpTitle")}</p>
                  <p className="mt-1 text-xs text-ink-muted">{t("helpMessage")}</p>
                  <Link href="/account/chat" onClick={handleClose} className="mt-3 inline-block">
                    <Button type="button" variant="secondary">
                      {t("getHelp")}
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Start screen: what others search for and the training goals -- one tap instead of typing. */}
            {trimmedQuery.length === 0 && (search.popular.length > 0 || search.allGoals.length > 0) && (
              <div className="space-y-6">
                {search.popular.length > 0 && (
                  <div>
                    <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                      {t("popularHeading")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {search.popular.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => fillQuery(term)}
                          className="rounded-full border border-border bg-surface-2/60 px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {search.allGoals.length > 0 && (
                  <div>
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("goalsHeading")}</p>
                    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                      {search.allGoals.map((goal) => {
                        const style = GOAL_STYLE[goal.code] ?? GOAL_STYLE.health;
                        const Icon = style.icon;
                        return (
                          <Link
                            key={goal.code}
                            href={`/products?goal=${goal.code}`}
                            onClick={handleClose}
                            className="flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-surface-2"
                          >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.tone}`}>
                              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-ink">{goal.name}</span>
                              <span className="block text-xs text-ink-soft">{t("goalCount", { count: goal.count })}</span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {trimmedQuery.length < 2 && !search.showRecent && categoryList.length === 0 && search.popular.length === 0 && search.allGoals.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-ink-soft">
                <Search className="h-8 w-8" strokeWidth={1.25} aria-hidden="true" />
                <p className="text-sm">{t("searchLabel")}</p>
              </div>
            )}

            {!search.loading && !search.error && products.length > 0 && (
              <div id="global-search-results" role="listbox" aria-label={t("productsHeading")} className="space-y-2">
                {products.map((product, idx) => (
                  <div
                    key={product.id}
                    id={`global-search-result-${idx}`}
                    role="option"
                    aria-selected={idx === activeIndex}
                    // A real click on the card navigates (the Link itself),
                    // which never calls `handleClose()` on its own -- without
                    // this, the overlay would stay logically "open" (body
                    // scroll still locked) after the page underneath had
                    // already changed. AddToCartButton/WishlistButton inside
                    // ProductCard already stopPropagation() on their own
                    // clicks, so this never fires for those, exactly per the
                    // "don't navigate on Add to Cart" requirement.
                    onClick={() => {
                      if (trimmedQuery) saveRecentSearch(trimmedQuery);
                      handleClose();
                    }}
                    className={`rounded-xl transition-colors ${idx === activeIndex ? "bg-primary-soft ring-1 ring-inset ring-primary/40" : ""}`}
                  >
                    <ProductCard
                      product={product}
                      brandName={brandNames[product.brand_id ?? ""] ?? null}
                      layout="list"
                      priority={idx < 4}
                      href={`/products/${product.slug}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Keyboard hints -- desktop only, no keyboard on mobile */}
        <div className="hidden shrink-0 items-center justify-center gap-5 border-t border-border px-4 py-2.5 text-xs text-ink-soft sm:flex">
          <span>{t("keyboardClose")}</span>
          <span>{t("keyboardNavigate")}</span>
          <span>{t("keyboardSelect")}</span>
        </div>
      </div>
    </div>
  );
}
