"use client";

import { Headset, Pin, Store as StoreIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Conversation } from "@/lib/account-api";
import type { CachedStoreSummary } from "@/lib/chat-store-cache";
import MediaImage from "@/components/MediaImage";
import { ReadTicks } from "@/components/chat/ChatBits";

/** Telegram-style time: HH:MM today, "Kecha"/weekday this week, then a short date. */
export function chatListTime(iso: string | null | undefined, locale: string, yesterday: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return yesterday;
  if (now.getTime() - d.getTime() < 6 * 86400000) return d.toLocaleDateString(locale === "uz" ? "uz-Latn" : locale, { weekday: "short" });
  return d.toLocaleDateString(locale === "uz" ? "uz-Latn" : locale, { day: "2-digit", month: "2-digit" });
}

/**
 * One chat in the customer's inbox, Telegram-style: avatar, name + time, last message preview ("Siz: …" for your
 * own) and the unread counter. A branch shows its location so the customer always knows which store they write to;
 * the single NutriZone Support chat (online orders) gets the brand avatar and a pin.
 */
export default function ConversationListItem({
  conversation,
  store,
  active,
  onClick,
}: {
  conversation: Conversation;
  store: CachedStoreSummary | null;
  active: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const isStore = conversation.conversation_type === "customer_sales";
  const title = isStore ? store?.name || t("storeConversationLabel") : t("supportTitle");
  const unread = conversation.unread_count ?? 0;
  const last = conversation.last_message;
  const accent = store?.color || "#10b981";
  const place = [store?.district, store?.city].filter(Boolean).join(", ");

  let preview: string = t("noMessagesYet");
  if (last) {
    const body =
      last.type === "sticker" ? `🎨 ${t("stickerPreview")}`
      : last.type === "attachment" ? `📎 ${t("attachmentPreview")}`
      : last.type === "card" ? `🛍️ ${last.content.startsWith("order:") ? t("orderCardPreview") : t("productCardPreview")}`
      : last.type === "system" ? `🤖 ${last.content}`
      : last.content;
    preview = last.is_mine ? `${t("you")}: ${body}` : body;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active}
      className={`group relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${active ? "bg-primary/12" : "hover:bg-surface-2/70"}`}
    >
      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />}
      <div className="relative h-12 w-12 shrink-0">
        <div
          className="h-full w-full overflow-hidden rounded-full"
          style={isStore ? { boxShadow: `0 0 0 2px color-mix(in srgb, ${accent} 55%, transparent)` } : undefined}
        >
          {isStore ? (
            <MediaImage src={store?.logoUrl ?? null} alt={title} fit="cover" fallbackIcon={<StoreIcon className="h-5 w-5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />} />
          ) : (
            <span className="nz-cta flex h-full w-full items-center justify-center text-white">
              <Headset className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </span>
          )}
        </div>
        {isStore && (
          <span
            aria-hidden="true"
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg ${conversation.other_participant_is_online ? "bg-emerald-500" : "bg-slate-400/70"}`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-[15px] ${unread ? "font-bold text-ink" : "font-semibold text-ink"}`}>{title}</p>
          {!isStore && <Pin className="h-3 w-3 shrink-0 rotate-45 text-ink-soft" strokeWidth={2} aria-label={t("pinned")} />}
          {last?.is_mine && <ReadTicks read={Boolean(last.read)} />}
          <span className={`shrink-0 text-xs tabular-nums ${unread ? "font-semibold text-primary" : "text-ink-soft"}`}>
            {chatListTime(last?.created_at ?? conversation.last_activity_at, locale, t("yesterday"))}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] font-medium text-ink-soft">
          {isStore ? (
            <>
              <span style={{ color: accent }}>● </span>
              {place ? `${place} · ${t("branchChip")}` : t("branchChip")}
            </>
          ) : (
            t("supportSubtitle")
          )}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-medium text-ink" : "text-ink-muted"}`}>{preview}</p>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white shadow-[0_4px_12px_-4px_var(--color-primary)]">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
