"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, ExternalLink, Headset, MapPin, Store as StoreIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Conversation } from "@/lib/account-api";
import type { CachedStoreSummary } from "@/lib/chat-store-cache";
import MediaImage from "@/components/MediaImage";

export default function ChatHeader({
  conversation,
  store,
  onBack,
  connectionStatus,
  liveOnline,
  typing = false,
}: {
  conversation: Conversation;
  store: CachedStoreSummary | null;
  onBack: () => void;
  /** Real-time delivery state from `useChatSocket` -- `undefined` when the caller doesn't track it. Only rendered when not "open", per this app's own "no clutter" design direction (a permanently-visible "Connected" chip adds noise a healthy connection doesn't need to announce). */
  connectionStatus?: "connecting" | "open" | "closed";
  /** Live presence from the conversation socket (overrides the list snapshot while connected). */
  liveOnline?: boolean;
  /** The store owner is typing right now. */
  typing?: boolean;
}) {
  const t = useTranslations("chat");
  const isStoreConversation = conversation.conversation_type === "customer_sales";
  const title = store?.name || (isStoreConversation ? t("storeConversationLabel") : t("generalSupportLabel"));
  const tRealtime = useTranslations("chatRealtime");
  const online = liveOnline ?? conversation.other_participant_is_online;

  const accent = store?.color || "#10b981";
  const place = [store?.district, store?.city].filter(Boolean).join(", ");
  const supportTitle = t("supportTitle");

  return (
    <div>
      <div className="nz-glass-strong flex shrink-0 items-center gap-3 border-b border-border/70 px-3 py-2.5 sm:px-4">
        <button type="button" onClick={onBack} aria-label={t("back")} className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-primary sm:hidden">
          <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </button>

        <div className="relative h-11 w-11 shrink-0">
          <div className="h-full w-full overflow-hidden rounded-full" style={isStoreConversation ? { boxShadow: `0 0 0 2px color-mix(in srgb, ${accent} 60%, transparent)` } : undefined}>
            {isStoreConversation ? (
              <MediaImage src={store?.logoUrl ?? null} alt={title} fit="cover" fallbackIcon={<StoreIcon className="h-5 w-5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />} />
            ) : (
              <span className="nz-cta flex h-full w-full items-center justify-center text-white">
                <Headset className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
            )}
          </div>
          {isStoreConversation && <span aria-hidden="true" className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg ${online ? "bg-emerald-500" : "bg-slate-400/70"}`} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[15px] font-bold text-ink">
            {isStoreConversation ? title : supportTitle}
            {!isStoreConversation && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} aria-hidden="true" />}
          </p>
          <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-ink-soft">
            {typing ? (
              <span className="font-medium text-primary">
                {tRealtime("typing")}
                <span className="inline-flex w-4 animate-pulse">…</span>
              </span>
            ) : isStoreConversation ? (
              <>
                <span className={online ? "font-medium text-emerald-500" : ""}>{online ? t("online") : t("offline")}</span>
                {place && (
                  <>
                    <span aria-hidden="true">·</span>
                    <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
                    <span className="truncate">{place}</span>
                  </>
                )}
              </>
            ) : (
              <span className="truncate">{t("supportSubtitle")}</span>
            )}
          </p>
        </div>

        {store?.slug && (
          <Link
            href={`/store/${store.slug}`}
            aria-label={t("viewStore")}
            title={t("viewStore")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-primary"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          </Link>
        )}
      </div>

      {isStoreConversation && store && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-1.5 text-[11px] text-ink-soft" style={{ background: `color-mix(in srgb, ${accent} 7%, transparent)` }}>
          <StoreIcon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} strokeWidth={2} aria-hidden="true" />
          <span className="truncate">
            {t("writingTo")}: <b className="font-semibold text-ink">{store.name}</b>
            {store.address ? ` · ${store.address}` : ""}
          </span>
          <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 font-semibold ${store.isOpenNow ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/15 text-ink-muted"}`}>
            {store.isOpenNow ? t("openNow") : t("closedNow")}
          </span>
        </div>
      )}

      {connectionStatus && connectionStatus !== "open" && (
        <div role="status" className="flex shrink-0 items-center gap-1.5 border-b border-border bg-warning/10 px-3.5 py-1.5 text-xs font-medium text-warning">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" aria-hidden="true" />
          {t("reconnecting")}
        </div>
      )}
    </div>
  );
}
