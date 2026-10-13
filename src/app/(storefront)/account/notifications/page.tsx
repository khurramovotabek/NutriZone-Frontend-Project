"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { InboxItem } from "@/lib/notifications-api";
import { emitNotificationsChanged, markNotificationsRead, relativeTime } from "@/lib/notification-events";
import { Button, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import AccountLayout from "@/components/AccountLayout";
import InboxIcon from "@/components/notifications/InboxIcon";

type Filter = "all" | "unread";

function dayKey(iso: string): "today" | "yesterday" | "earlier" {
  const d = new Date(iso);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (d >= start) return "today";
  start.setDate(start.getDate() - 1);
  return d >= start ? "yesterday" : "earlier";
}

export default function NotificationsPage() {
  const t = useTranslations("account.notificationsPage");
  const tn = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<"login" | "load" | null>(null);

  const fetchPage = useCallback(
    async (nextPage: number, f: Filter) => {
      const res = await fetch(`/api/notifications?lang=${locale}&filter=${f}&page=${nextPage}&page_size=20`, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      return { ok: res.ok && !!body?.success, status: res.status, data: body?.data as { items: InboxItem[]; unread: number; has_more: boolean } | undefined };
    },
    [locale],
  );

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchPage>>, nextPage: number) => {
    if (!result.ok || !result.data) {
      setError(result.status === 401 ? "login" : "load");
      return;
    }
    const data = result.data;
    setError(null);
    setItems((prev) => (nextPage === 1 || !prev ? data.items : [...prev, ...data.items]));
    setUnread(data.unread);
    setHasMore(data.has_more);
    setPage(nextPage);
    emitNotificationsChanged(data.unread);
  }, []);

  const load = useCallback(async (nextPage: number, f: Filter) => apply(await fetchPage(nextPage, f), nextPage), [apply, fetchPage]);

  useEffect(() => {
    let cancelled = false;
    fetchPage(1, filter)
      .then((result) => !cancelled && apply(result, 1))
      .catch(() => !cancelled && setError("load"));
    return () => {
      cancelled = true;
    };
  }, [fetchPage, apply, filter]);

  const groups = useMemo(() => {
    const out: { key: "today" | "yesterday" | "earlier"; items: InboxItem[] }[] = [];
    for (const item of items ?? []) {
      const key = dayKey(item.created_at);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(item);
      else out.push({ key, items: [item] });
    }
    return out;
  }, [items]);

  async function open(item: InboxItem) {
    if (!item.read) {
      setItems((prev) => prev?.map((i) => (i.id === item.id ? { ...i, read: true } : i)) ?? prev);
      setUnread((n) => Math.max(n - 1, 0));
      markNotificationsRead({ ids: [item.id] });
    }
    if (item.link) router.push(item.link);
  }

  async function markAll() {
    setItems((prev) => prev?.map((i) => ({ ...i, read: true })) ?? prev);
    setUnread(0);
    await markNotificationsRead({ all: true });
    if (filter === "unread") load(1, "unread");
  }

  if (error) {
    return (
      <AccountLayout>
        <ErrorState
          message={error === "login" ? t("loginPrompt") : t("loadError")}
          action={
            error === "login" && (
              <Link href="/login?next=/account/notifications">
                <Button variant="primary">{t("goToLogin")}</Button>
              </Link>
            )
          }
        />
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-ink">
            {t("title")}
            {unread > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{tn("subtitle")}</p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAll} className="nz-glass flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
            <CheckCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {tn("markAllRead")}
          </button>
        )}
      </div>

      <div role="tablist" aria-label={t("title")} className="nz-glass mb-5 inline-flex rounded-full p-1">
        {(["all", "unread"] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            type="button"
            aria-selected={filter === f}
            onClick={() => {
              if (f === filter) return;
              setItems(null);
              setFilter(f);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${filter === f ? "nz-cta text-white shadow" : "text-ink-muted hover:text-ink"}`}
          >
            {tn(f)}
            {f === "unread" && unread > 0 ? ` · ${unread}` : ""}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[84px] w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-16 w-16" strokeWidth={1.25} aria-hidden="true" />}
          title={filter === "unread" ? tn("allRead") : t("emptyTitle")}
          description={filter === "unread" ? tn("emptyHint") : t("emptyDescription")}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key + g.items[0].id}>
              <h2 className="mb-2.5 px-1 text-xs font-bold uppercase tracking-wider text-ink-soft">{tn(g.key)}</h2>
              <ul className="space-y-2.5">
                {g.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => open(item)}
                      className={`nz-glass group relative flex w-full items-start gap-3.5 whitespace-normal rounded-2xl p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-4 ${
                        item.read ? "opacity-80 hover:opacity-100" : "ring-1 ring-primary/25"
                      }`}
                    >
                      {!item.read && <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary" aria-hidden="true" />}
                      <InboxIcon icon={item.icon} tone={item.tone} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className={`text-[15px] leading-snug ${item.read ? "font-medium text-ink" : "font-semibold text-ink"}`}>{item.title}</span>
                          <span className="shrink-0 pt-0.5 text-[11px] text-ink-soft">{relativeTime(item.created_at, locale)}</span>
                        </span>
                        {item.body && <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{item.body}</span>}
                        {item.link && (
                          <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
                            {tn("open")}
                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} aria-hidden="true" />
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                disabled={loadingMore}
                onClick={async () => {
                  setLoadingMore(true);
                  await load(page + 1, filter).finally(() => setLoadingMore(false));
                }}
              >
                {tn("loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}
    </AccountLayout>
  );
}
