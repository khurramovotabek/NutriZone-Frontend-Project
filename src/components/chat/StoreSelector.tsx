"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import { createPortal } from "react-dom";
import { AlertCircle, ChevronRight, Loader2, MapPin, Search, Store as StoreIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { getStores, type StoreListItem } from "@/lib/store-api";
import type { ConversationDetail } from "@/lib/account-api";
import type { CachedStoreSummary } from "@/lib/chat-store-cache";
import { cacheConversationStore } from "@/lib/chat-store-cache";
import MediaImage from "@/components/MediaImage";
import { Skeleton } from "@/components/ui";

function toStoreSummary(store: StoreListItem): CachedStoreSummary {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    logoUrl: store.logo_url,
    city: store.city,
    district: store.district,
    address: store.address,
    isOpenNow: store.is_open_now,
  };
}

/**
 * "Which NutriZone store do I want to talk to?" -- the picker
 * `POST /account/chat`'s "+ Yangi suhbat" opens. Real stores only,
 * fetched from the same public `GET /stores` this app's own Stores
 * page uses. No name-search endpoint exists on the backend (only
 * `city`/`district`/`open_now`/geo filters -- confirmed against
 * `getStores`), so the search box filters client-side over the one
 * page of already-loaded stores rather than fabricating a server-side
 * search; `/stores` (page_size 20) already holds every real store
 * today, matching that page's own documented assumption.
 */
export default function StoreSelector({
  open,
  onClose,
  onSelected,
}: {
  open: boolean;
  onClose: () => void;
  onSelected: (conversation: ConversationDetail, store: CachedStoreSummary) => void;
}) {
  const t = useTranslations("chat.storeSelector");
  const tStores = useTranslations("stores");
  const mounted = useIsClient();
  const [stores, setStores] = useState<StoreListItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const loading = open && !stores && !loadError;
  // Real, closed gap: the backend correctly rejects opening a
  // `customer_sales` conversation with your own store (confirmed:
  // `OpenStoreConversationView.post`) -- fetched via the same real
  // `GET /api/my-store` the Store Dashboard itself uses, so a store
  // owner's own store never appears as a pickable option here at all.
  const [ownStoreId, setOwnStoreId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [openingStoreId, setOpeningStoreId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);


  useEffect(() => {
    if (!open) return;
    fetch("/api/my-store", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => setOwnStoreId(body?.success ? (body.data?.id ?? null) : null))
      .catch(() => setOwnStoreId(null));
  }, [open]);

  // Loads once per session of the modal being open; clearing `loadError`
  // (the Retry button) re-runs it.
  useEffect(() => {
    if (!open || stores || loadError) return;
    let cancelled = false;
    getStores({})
      .then((result) => {
        if (!cancelled) setStores(result.results);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, stores, loadError]);

  // Every fresh open starts from a clean search (adjusted during render).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setSelectError(null);
      setActiveIndex(0);
    }
  }

  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => clearTimeout(focusTimer);
  }, [open]);

  // Debounced client-side search over the already-loaded list; a new
  // search always starts keyboard selection back at the top.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
      setActiveIndex(0);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const filteredStores = useMemo(() => {
    if (!stores) return [];
    const withoutOwnStore = ownStoreId ? stores.filter((s) => s.id !== ownStoreId) : stores;
    if (!debouncedQuery) return withoutOwnStore;
    return withoutOwnStore.filter((s) => `${s.name} ${s.city} ${s.district} ${s.address}`.toLowerCase().includes(debouncedQuery));
  }, [stores, debouncedQuery, ownStoreId]);

  async function handleSelect(store: StoreListItem) {
    if (openingStoreId) return;
    setOpeningStoreId(store.id);
    setSelectError(null);
    try {
      const res = await fetch(`/api/chat/conversations/store/${store.id}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setSelectError(body.error?.message ?? t("selectError"));
        return;
      }
      const summary = toStoreSummary(store);
      cacheConversationStore(body.data.id, summary);
      onSelected(body.data as ConversationDetail, summary);
    } catch {
      setSelectError(t("networkError"));
    } finally {
      setOpeningStoreId(null);
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent) {
    if (filteredStores.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min(i + 1, filteredStores.length - 1);
        itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.max(i - 1, 0);
        itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const store = filteredStores[activeIndex];
      if (store) handleSelect(store);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="animate-nz-fade-in absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className="nz-glass-strong animate-nz-fade-in relative flex max-h-[min(38rem,85vh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{t("title")}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="shrink-0 border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleListKeyDown}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="nz-glass-input w-full rounded-xl py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div role="listbox" aria-label={t("title")} className="flex-1 overflow-y-auto p-2" onKeyDown={handleListKeyDown}>
          {loading && (
            <div className="space-y-2 p-1">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && loadError && (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-sm text-ink-muted">{t("loadError")}</p>
              <button type="button" onClick={() => setLoadError(false)} className="text-sm font-medium text-primary hover:brightness-110">
                {t("retry")}
              </button>
            </div>
          )}

          {!loading && !loadError && stores && stores.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <StoreIcon className="h-8 w-8 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />
              <p className="text-sm text-ink-muted">{t("noStores")}</p>
            </div>
          )}

          {!loading && !loadError && stores && stores.length > 0 && filteredStores.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Search className="h-8 w-8 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />
              <p className="text-sm text-ink-muted">{t("noResults", { query })}</p>
            </div>
          )}

          {!loading &&
            !loadError &&
            filteredStores.map((store, index) => {
              const isOpening = openingStoreId === store.id;
              const isActive = index === activeIndex;
              return (
                <button
                  key={store.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={openingStoreId !== null}
                  onClick={() => handleSelect(store)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors disabled:cursor-wait ${
                    isActive ? "bg-primary-soft/70" : "hover:bg-surface-2"
                  }`}
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    <MediaImage src={store.logo_url} alt={store.name} fit="cover" fallbackIcon={<StoreIcon className="h-5 w-5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{store.name}</p>
                    {(store.address || store.city) && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-muted">
                        <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        {store.address || [store.district, store.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-1.5 text-xs">
                      {store.status === "active" ? (
                        <>
                          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${store.is_open_now ? "bg-success" : "bg-ink-soft/40"}`} />
                          <span className={store.is_open_now ? "font-medium text-success" : "text-ink-soft"}>{store.is_open_now ? tStores("open") : tStores("closed")}</span>
                        </>
                      ) : store.status === "temporarily_closed" ? (
                        <span className="text-amber-600 dark:text-amber-400">{tStores("temporarilyClosed")}</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400">{tStores("comingSoon")}</span>
                      )}
                    </p>
                  </div>
                  {isOpening ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-soft" strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" strokeWidth={2} aria-hidden="true" />
                  )}
                </button>
              );
            })}
        </div>

        {selectError && (
          <p role="alert" className="shrink-0 border-t border-border px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {selectError}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
