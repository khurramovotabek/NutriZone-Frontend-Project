"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, Loader2, RotateCw } from "lucide-react";

/**
 * The one "show more" footer for every incrementally loaded list (reviews, notifications, orders, sales
 * history, inquiries): a "12 of 48" counter with a progress line, a full-width tap target on phones, a
 * spinner while loading, a retry after a failure and an "all shown" end state.
 *
 * `auto` also loads the next page when the footer scrolls into view (infinite scroll, the way phone users
 * expect a feed to behave); the button stays as the keyboard / screen-reader path and after an error.
 */
export default function LoadMore({
  hasMore,
  loading,
  onMore,
  shown,
  total,
  error = false,
  auto = true,
  className = "",
}: {
  hasMore: boolean;
  loading: boolean;
  onMore: () => void;
  shown?: number;
  total?: number;
  error?: boolean;
  auto?: boolean;
  className?: string;
}) {
  const t = useTranslations("common.list");
  const sentinel = useRef<HTMLDivElement>(null);
  const onMoreRef = useRef(onMore);
  useEffect(() => {
    onMoreRef.current = onMore;
  }, [onMore]);

  useEffect(() => {
    const el = sentinel.current;
    if (!auto || !el || !hasMore || loading || error || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) onMoreRef.current();
    }, { rootMargin: "320px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [auto, hasMore, loading, error]);

  if (!hasMore && !shown) return null;
  const percent = shown && total ? Math.min(100, Math.round((shown / total) * 100)) : null;

  return (
    <div ref={sentinel} className={`mx-auto flex w-full max-w-sm flex-col items-center gap-3 pt-2 ${className}`}>
      {(shown ?? 0) > 0 && (
        <div className="flex w-full flex-col items-center gap-1.5" aria-live="polite">
          {percent !== null && (
            <div className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
          )}
          <p className="text-xs tabular-nums text-ink-muted">
            {total ? t("shown", { shown: shown ?? 0, total }) : t("shownOnly", { shown: shown ?? 0 })}
          </p>
        </div>
      )}

      {hasMore ? (
        error ? (
          <button
            type="button"
            onClick={onMore}
            className="nz-glass inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-red-600 transition-colors hover:text-red-700 sm:w-auto dark:text-red-400"
          >
            <RotateCw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {t("error")} · {t("retry")}
          </button>
        ) : (
          <button
            type="button"
            onClick={onMore}
            disabled={loading}
            aria-busy={loading}
            className="nz-glass inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:text-primary disabled:pointer-events-none disabled:opacity-70 sm:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" /> : <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
            {loading ? t("loading") : t("more")}
          </button>
        )
      ) : (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={2} aria-hidden="true" />
          {t("allShown")}
        </p>
      )}
    </div>
  );
}

/** Client-side stepping for a list already in memory: the first `step` items, +`step` per "show more";
 *  starts over whenever `resetKey` (filter, search, sort) changes. */
export function useSteppedList<T>(items: T[], step: number, resetKey: string) {
  const [limit, setLimit] = useState(step);
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setLimit(step);
  }
  return {
    shown: items.slice(0, limit),
    more: () => setLimit((n) => n + step),
    hasMore: items.length > limit,
    total: items.length,
  };
}
