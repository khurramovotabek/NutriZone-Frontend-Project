"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { InboxItem } from "@/lib/notifications-api";
import { markNotificationsRead, onNotificationsChanged, relativeTime } from "@/lib/notification-events";
import InboxIcon from "@/components/notifications/InboxIcon";

const POLL_MS = 45_000;

/**
 * Header bell with the unread count. Desktop opens a glass dropdown with the latest messages; on phones
 * (`compact`) it is a plain link to /account/notifications -- a dropdown under a sticky header is cramped on
 * a small screen and the full page is one tap away. Hidden for visitors without a session.
 */
export default function NotificationBell({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    fetch("/api/notifications/unread-count", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setUnread(b?.data?.anonymous ? null : (b?.data?.unread ?? 0)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const id = window.setInterval(() => document.visibilityState === "visible" && refreshCount(), POLL_MS);
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    const off = onNotificationsChanged((n) => (typeof n === "number" ? setUnread(n) : refreshCount()));
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      off();
    };
  }, [refreshCount, pathname]);

  const loadLatest = useCallback(() => {
    fetch(`/api/notifications?lang=${locale}&page_size=6`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        if (!b?.success) return;
        setItems(b.data.items);
        setUnread(b.data.unread);
      })
      .catch(() => setItems([]));
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => wrapRef.current && !wrapRef.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (unread === null) return null;

  const badge = unread > 0 && (
    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_0_2px_var(--color-bg,#0b1220)]">
      {unread > 99 ? "99+" : unread}
    </span>
  );

  if (compact) {
    return (
      <Link href="/account/notifications" aria-label={`${t("bell")}${unread ? ` · ${t("unreadCount", { count: unread })}` : ""}`} className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-primary">
        <Bell className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        {badge}
      </Link>
    );
  }

  async function openItem(item: InboxItem) {
    setOpen(false);
    if (!item.read) {
      setItems((prev) => prev?.map((i) => (i.id === item.id ? { ...i, read: true } : i)) ?? prev);
      markNotificationsRead({ ids: [item.id] });
    }
    router.push(item.link || "/account/notifications");
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) loadLatest();
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t("bell")}${unread ? ` · ${t("unreadCount", { count: unread })}` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-all hover:bg-primary/10 hover:text-primary"
      >
        <Bell className={`h-5 w-5 ${unread ? "origin-top animate-[nz-bell_1.2s_ease-in-out_1]" : ""}`} strokeWidth={1.75} aria-hidden="true" />
        {badge}
      </button>

      {open && (
        <div role="dialog" aria-label={t("bell")} className="nz-glass-strong animate-nz-fade-in absolute right-0 top-[calc(100%+12px)] z-50 w-[380px] overflow-hidden rounded-2xl bg-bg/90 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-bold text-ink">{t("bell")}</p>
              <p className="text-xs text-ink-soft">{unread ? t("unreadCount", { count: unread }) : t("allRead")}</p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={async () => {
                  setItems((prev) => prev?.map((i) => ({ ...i, read: true })) ?? prev);
                  setUnread(0);
                  await markNotificationsRead({ all: true });
                }}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <CheckCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {t("markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto overscroll-contain">
            {items === null ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-xl bg-surface-2" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
                      <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bell className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-ink">{t("empty")}</p>
                <p className="text-xs text-ink-soft">{t("emptyHint")}</p>
              </div>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className={`group relative flex w-full gap-3 whitespace-normal px-4 py-3 text-left transition-colors hover:bg-primary/5 ${item.read ? "" : "bg-primary/[0.04]"}`}
                    >
                      <InboxIcon icon={item.icon} tone={item.tone} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${item.read ? "font-medium text-ink-muted" : "font-semibold text-ink"}`}>{item.title}</span>
                        {item.body && <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-ink-soft">{item.body}</span>}
                        <span className="mt-1 block text-[11px] text-ink-soft">{relativeTime(item.created_at, locale)}</span>
                      </span>
                      {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/account/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-border px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            {t("viewAll")}
            <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
