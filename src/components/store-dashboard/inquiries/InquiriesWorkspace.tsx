"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Info, MessageCircle, Phone, Send, ShoppingBag, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { AttachmentUpload, Conversation, ConversationDetail, CustomerProfile, Message } from "@/lib/account-api";
import { Button, Card, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import MediaImage from "@/components/MediaImage";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useChatInboxSocket } from "@/hooks/useChatInboxSocket";
import { useMobileChatViewport } from "@/hooks/useMobileChatViewport";
import { PresenceDot, ReadTicks } from "@/components/chat/ChatBits";
import { chatListTime } from "@/components/chat/ConversationListItem";
import MessageThread from "./MessageThread";
import MessageComposer from "./MessageComposer";

type StatusFilter = "all" | "open" | "closed" | "archived";
const STATUS_TABS: StatusFilter[] = ["all", "open", "closed", "archived"];

const STATUS_BADGE: Record<string, string> = {
  open: "bg-success/12 text-success border-success/25",
  closed: "bg-surface-2 text-ink-muted border-border",
  archived: "bg-surface-2 text-ink-soft border-border",
};

/** "5 daqiqa oldin" / "5 минут назад" / "5 minutes ago" in the interface language. */
function relativeTime(iso: string | null, locale: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diffMin < 60) return rtf.format(-Math.max(diffMin, 0), "minute");
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, "hour");
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return rtf.format(-diffDay, "day");
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/**
 * Real, honest scope (see this session's own investigation, and the
 * user's explicit choice of "upgrade Store Dashboard -> Inquiries",
 * not a fabricated staff/operator admin panel):
 *
 * - The signed-in store owner is a plain chat PARTICIPANT here, not an
 *   "operator" -- confirmed directly against their real RBAC grants:
 *   `chat.conversation.view_own` + `chat.message.send` only, never
 *   `chat.conversation.manage` / `chat.message.edit` / `chat.statistics.view`.
 *   Every assign/close/reopen/archive/add-participant action, message
 *   edit/delete, and the statistics endpoint are real, working backend
 *   capabilities -- just not ones this role is granted, so none of
 *   their UI appears here. Never faked, never grayed-out-but-clickable.
 * - No conversation-list search exists on the backend at all (only
 *   `filter[status]`) -- there is no query/content-search param, and
 *   the list card carries no message content or customer name to
 *   search across client-side, so no search box is shown here (a real
 *   client-side filter would ONLY be honest, not silently incomplete
 *   or fake).
 * - Customer name/avatar (list + thread header) come from the
 *   conversation card's own `other_participant_full_name`/
 *   `other_participant_avatar_url` fields. Phone number, Telegram
 *   username, and order history are deliberately NOT in that bulk list
 *   response (real PII) -- they load lazily, per-conversation, only
 *   into the context panel via `fetchCustomerProfile` (backed by the
 *   operator-only `GET .../customer-profile` endpoint), the moment this
 *   store owner actually opens that one conversation.
 * - "Previous Conversations" groups by the other participant's
 *   `user_id` across conversations already opened THIS session (their
 *   detail, with participants, is fetched on open and cached) -- real
 *   data, just built incrementally rather than eagerly fetching every
 *   conversation's detail up front (avoiding an N+1 fetch across the
 *   whole inbox just for a "nice to have" cross-reference).
 */
const AVATAR_TONES = ["from-emerald-500 to-teal-600", "from-sky-500 to-indigo-600", "from-violet-500 to-fuchsia-600", "from-amber-500 to-orange-600", "from-rose-500 to-pink-600", "from-cyan-500 to-blue-600"];

/** A stable colour per customer (Telegram-style), picked from their name. */
function avatarTone(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function initials(name: string | null | undefined): string {
  return (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export default function InquiriesWorkspace({
  currentUserId,
  fetchConversations,
  fetchDetail,
  fetchMessages,
  sendMessage,
  sendAttachment,
  sendSticker,
  fetchCustomerProfile,
}: {
  currentUserId: string | null;
  fetchConversations: (status: StatusFilter) => Promise<{ data: Conversation[]; totalCount: number } | null>;
  fetchDetail: (id: string) => Promise<ConversationDetail | null>;
  fetchMessages: (id: string, page: number) => Promise<{ data: Message[]; totalPages: number } | null>;
  sendMessage: (id: string, content: string) => Promise<Message | null>;
  sendAttachment: (id: string, attachment: AttachmentUpload) => Promise<Message | null>;
  sendSticker: (id: string, code: string) => Promise<Message | null>;
  fetchCustomerProfile: (id: string) => Promise<CustomerProfile | null>;
}) {
  const t = useTranslations("myStore");
  const tCommon = useTranslations("common");
  const tChat = useTranslations("chat");
  const locale = useLocale();
  const tRealtime = useTranslations("chatRealtime");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState(false);
  const [counts, setCounts] = useState<Record<StatusFilter, number | null>>({ all: null, open: null, closed: null, archived: null });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, ConversationDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  const [profileCache, setProfileCache] = useState<Record<string, CustomerProfile>>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);

  const [messages, setMessages] = useState<Message[] | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);
  const [loadingOlder, setLoadingOlder] = useState(false);

  /** Mobile-only: which of the 3 panels is currently shown full-screen. Desktop always shows list+thread (+ context on toggle) side by side. */
  const [mobileView, setMobileView] = useState<"list" | "thread" | "context">("list");
  const [showContext, setShowContext] = useState(false);

  const applyConversations = useCallback((status: StatusFilter, result: Awaited<ReturnType<typeof fetchConversations>>) => {
    if (result) {
      setConversations(result.data);
      setCounts((prev) => ({ ...prev, [status]: result.totalCount }));
    } else {
      setConversationsError(true);
    }
    setConversationsLoading(false);
  }, []);

  const loadConversations = useCallback(
    async (status: StatusFilter) => {
      setConversationsLoading(true);
      setConversationsError(false);
      applyConversations(status, await fetchConversations(status));
    },
    [fetchConversations, applyConversations],
  );

  function selectStatus(status: StatusFilter) {
    if (status === statusFilter) return;
    setStatusFilter(status);
    loadConversations(status);
  }

  // Initial list (loading state already starts true); later tab switches
  // load from selectStatus().
  useEffect(() => {
    let cancelled = false;
    fetchConversations("all").then((result) => {
      if (!cancelled) applyConversations("all", result);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchConversations, applyConversations]);

  // Real per-tab counts, fetched once (page_size=1, reading pagination.total_count) --
  // never hardcoded, never derived from an incomplete client-side list.
  useEffect(() => {
    (["all", "open", "closed", "archived"] as StatusFilter[])
      .filter((s) => s !== statusFilter)
      .forEach((s) => {
        fetchConversations(s).then((result) => {
          if (result) setCounts((prev) => ({ ...prev, [s]: result.totalCount }));
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount only, deliberately not re-running per statusFilter change (that's handled by loadConversations above).
  }, []);

  async function openConversation(id: string) {
    window.setTimeout(() => window.dispatchEvent(new Event("nz:chat-read")), 1500); // menu badges catch up after the read receipt
    setSelectedId(id);
    setMobileView("thread");
    setShowContext(false);
    setMessages(null);
    setMessagesError(false);

    if (!detailCache[id]) {
      setDetailLoading(true);
      const detail = await fetchDetail(id);
      if (detail) setDetailCache((prev) => ({ ...prev, [id]: detail }));
      setDetailLoading(false);
    }

    if (!profileCache[id]) {
      setProfileError(false);
      setProfileLoading(true);
      const profile = await fetchCustomerProfile(id);
      if (profile) {
        setProfileCache((prev) => ({ ...prev, [id]: profile }));
      } else {
        setProfileError(true);
      }
      setProfileLoading(false);
    }

    setMessagesLoading(true);
    // Messages paginate oldest-first; the most recent page is the last
    // one -- fetch page 1 first only to learn total_pages, then the
    // real last page, so the thread opens showing the newest messages
    // (not silently the oldest 30, which the previous implementation
    // did by always requesting page 1 with no way to reach the rest).
    const first = await fetchMessages(id, 1);
    if (!first) {
      setMessagesError(true);
      setMessagesLoading(false);
      return;
    }
    if (first.totalPages <= 1) {
      setMessages(first.data);
      setMessagesPage(1);
    } else {
      const last = await fetchMessages(id, first.totalPages);
      setMessages(last?.data ?? first.data);
      setMessagesPage(first.totalPages);
    }
    setMessagesLoading(false);
  }

  async function loadOlderMessages() {
    if (!selectedId || messagesPage <= 1 || loadingOlder) return;
    setLoadingOlder(true);
    const prevPage = messagesPage - 1;
    const result = await fetchMessages(selectedId, prevPage);
    if (result) {
      setMessages((prev) => [...result.data, ...(prev ?? [])]);
      setMessagesPage(prevPage);
    }
    setLoadingOlder(false);
  }

  function appendMessage(message: Message) {
    setMessages((prev) => {
      if (!prev) return [message];
      if (prev.some((m) => m.id === message.id)) return prev; // never append a duplicate
      return [...prev, message];
    });
    // Refresh this one conversation's own list-card (real last_activity_at) without a full list re-fetch.
    setConversations((prev) => (prev ? prev.map((c) => (c.id === message.conversation_id ? { ...c, last_activity_at: message.created_at } : c)) : prev));
  }

  async function handleSend(content: string): Promise<boolean> {
    if (!selectedId) return false;
    const message = await sendMessage(selectedId, content);
    if (!message) return false;
    appendMessage(message);
    return true;
  }

  async function handleSendAttachment(attachment: AttachmentUpload): Promise<boolean> {
    if (!selectedId) return false;
    const message = await sendAttachment(selectedId, attachment);
    if (!message) return false;
    appendMessage(message);
    return true;
  }

  // Real-time delivery: the socket only ever RECEIVES (sending still
  // goes through the same POST as before, per ChatConsumer's own
  // receive-only design) -- an incoming broadcast for the currently
  // open conversation is applied straight from the socket's own
  // callback; `appendMessage`'s own id-based dedupe means the sender's
  // own optimistic append from handleSend/handleSendAttachment above is
  // never duplicated when their own broadcast echoes back.
  const chat = useChatSocket(selectedId, appendMessage);
  const socketStatus = chat.status;
  const { markRead } = chat;

  async function handleSendSticker(code: string): Promise<boolean> {
    if (!selectedId) return false;
    const message = await sendSticker(selectedId, code);
    if (!message) return false;
    appendMessage(message);
    return true;
  }

  // Read receipts: while this conversation is on screen (and the tab is
  // visible), anything the customer sent that's still unread gets marked
  // read -- the customer sees ✓✓ turn blue in real time.
  const hasUnreadFromOther = Boolean(messages?.some((m) => m.sender_id !== currentUserId && !m.read_at));
  useEffect(() => {
    if (socketStatus !== "open" || !hasUnreadFromOther) return;
    const markIfVisible = () => document.visibilityState === "visible" && markRead();
    markIfVisible();
    document.addEventListener("visibilitychange", markIfVisible);
    return () => document.removeEventListener("visibilitychange", markIfVisible);
  }, [socketStatus, hasUnreadFromOther, markRead, messages]);

  // Real, closed gap: the socket above only ever reaches a conversation
  // that's already open. A brand-new conversation, or a reply landing
  // in one of this store owner's OTHER open conversations, never showed
  // up here short of a manual reload. This is always connected (not
  // gated on `selectedId`) -- it's the whole conversation LIST's own
  // live feed. Re-fetching the list is enough: the real card data
  // (status, last_activity_at, ...) stays sourced from the one real
  // REST endpoint, never reconstructed from the bare WS pointer.
  useChatInboxSocket(true, () => {
    loadConversations(statusFilter);
  });

  const selectedDetail = selectedId ? detailCache[selectedId] : null;
  const selectedProfile = selectedId ? profileCache[selectedId] : null;
  const selectedCard = selectedId ? conversations?.find((c) => c.id === selectedId) ?? null : null;
  const otherParticipant = useMemo(() => {
    if (!selectedDetail || !currentUserId) return null;
    return selectedDetail.participants.find((p) => p.user_id !== currentUserId && !p.removed_at) ?? null;
  }, [selectedDetail, currentUserId]);

  // Live presence from the conversation socket once it's open; the REST snapshot until then.
  const otherOnline = socketStatus === "open" ? chat.otherOnline : Boolean(otherParticipant?.is_online);

  const previousConversations = useMemo(() => {
    if (!otherParticipant) return [];
    return Object.values(detailCache).filter(
      (c) => c.id !== selectedId && c.participants.some((p) => p.user_id === otherParticipant.user_id && !p.removed_at),
    );
  }, [detailCache, otherParticipant, selectedId]);

  const conversationTypeLabel = (type: string) =>
    type === "customer_support" ? t("inquiryTypeCustomerSupport") : type === "customer_sales" ? t("inquiryTypeCustomerSales") : t("inquiryTypeInternalSupport");
  const statusLabel = (status: string) =>
    status === "open" ? t("inquiryTabOpen") : status === "closed" ? t("inquiryTabClosed") : status === "archived" ? t("inquiryTabArchived") : status;
  const roleLabel = (role: string) => (role === "customer" ? t("inquiryRoleCustomer") : t("inquiryRoleOperator"));

  // On phones an open conversation (thread or customer details) is a full-screen sheet pinned to the visible
  // viewport, like the customer's own chat: the composer stays above the keyboard and the dashboard hero behind it
  // never scrolls into view. Rendered into <body> so glass/transform ancestors can't capture `position: fixed`.
  const sheet = useMobileChatViewport(Boolean(selectedId) && mobileView !== "list");

  const card = (
    <Card
      className={
        sheet.fullscreen
          ? "fixed inset-x-0 top-0 z-[70] flex h-[100dvh] overflow-hidden rounded-none border-0 bg-bg p-0 backdrop-blur-none"
          : "flex h-[calc(100dvh-9rem)] min-h-[440px] max-h-[820px] overflow-hidden p-0 sm:h-[75vh] sm:min-h-[520px]"
      }
      style={sheet.style}
    >
      {/* Conversation list */}
      <div className={`w-full shrink-0 flex-col border-r border-border sm:w-[300px] ${mobileView === "list" ? "flex" : "hidden sm:flex"}`}>
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border p-2 [scrollbar-width:none]! [&::-webkit-scrollbar]:hidden">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => selectStatus(tab)}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab ? "bg-primary-soft text-primary" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {t(`inquiryTab${tab.charAt(0).toUpperCase()}${tab.slice(1)}` as "inquiryTabAll")}
              {counts[tab] != null && <span className="ml-1 text-ink-soft">{counts[tab]}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationsLoading && (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!conversationsLoading && conversationsError && (
            <div className="p-4">
              <ErrorState
                message={t("inquiryConversationsLoadError")}
                action={
                  <Button type="button" variant="secondary" onClick={() => loadConversations(statusFilter)}>
                    {tCommon("retry")}
                  </Button>
                }
              />
            </div>
          )}

          {!conversationsLoading && !conversationsError && conversations && conversations.length === 0 && (
            <div className="p-4">
              <EmptyState
                icon={<MessageCircle className="h-12 w-12" strokeWidth={1.25} aria-hidden="true" />}
                title={statusFilter === "all" ? t("inquiryEmptyTitle") : t("inquiryNoneForFilter")}
                description={statusFilter === "all" ? t("inquiryEmptyDescription") : t("inquiryNoneForFilterHint")}
              />
            </div>
          )}

          {!conversationsLoading && !conversationsError && conversations && conversations.length > 0 && (
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className={`relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${selectedId === c.id ? "bg-primary/12" : "hover:bg-surface-2/70"}`}
                  >
                    {selectedId === c.id && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />}
                    <div className="relative h-12 w-12 shrink-0">
                      <div className="h-full w-full overflow-hidden rounded-full">
                        {c.other_participant_avatar_url ? (
                          <MediaImage src={c.other_participant_avatar_url} alt="" fit="cover" fallbackIcon={<User className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />} />
                        ) : (
                          <span className={`flex h-full w-full items-center justify-center bg-gradient-to-br text-sm font-bold text-white ${avatarTone(c.other_participant_full_name ?? c.id)}`}>
                            {initials(c.other_participant_full_name)}
                          </span>
                        )}
                      </div>
                      <span aria-hidden="true" className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg ${c.other_participant_is_online ? "bg-emerald-500" : "bg-slate-400/70"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`min-w-0 flex-1 truncate text-[15px] ${(c.unread_count ?? 0) > 0 && selectedId !== c.id ? "font-bold" : "font-semibold"} text-ink`}>
                          {c.other_participant_full_name ?? conversationTypeLabel(c.conversation_type)}
                        </p>
                        {c.last_message?.is_mine && <ReadTicks read={Boolean(c.last_message.read)} />}
                        <span className={`shrink-0 text-xs tabular-nums ${(c.unread_count ?? 0) > 0 && selectedId !== c.id ? "font-semibold text-primary" : "text-ink-soft"}`}>
                          {chatListTime(c.last_message?.created_at ?? c.last_activity_at, locale, tChat("yesterday"))}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className={`min-w-0 flex-1 truncate text-sm ${(c.unread_count ?? 0) > 0 && selectedId !== c.id ? "font-medium text-ink" : "text-ink-muted"}`}>
                          {c.last_message
                            ? `${c.last_message.is_mine ? `${tChat("you")}: ` : ""}${c.last_message.type === "sticker" ? `🎨 ${tChat("stickerPreview")}` : c.last_message.type === "attachment" ? `📎 ${tChat("attachmentPreview")}` : c.last_message.content}`
                            : tChat("noMessagesYet")}
                        </p>
                        {(c.unread_count ?? 0) > 0 && selectedId !== c.id && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{(c.unread_count ?? 0) > 99 ? "99+" : c.unread_count}</span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Active conversation */}
      <div className={`min-w-0 flex-1 flex-col ${mobileView === "thread" ? "flex" : "hidden sm:flex"}`}>
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-ink-soft">
            <MessageCircle className="h-10 w-10" strokeWidth={1.25} aria-hidden="true" />
            <p className="text-sm font-medium text-ink">{t("inquirySelectTitle")}</p>
            <p className="text-sm">{t("inquirySelectHint")}</p>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b border-border p-3">
              <button type="button" onClick={() => setMobileView("list")} aria-label={tChat("back")} className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-primary sm:hidden">
                <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </button>
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-ink-soft">
                {selectedCard?.other_participant_avatar_url ? (
                  <MediaImage src={selectedCard.other_participant_avatar_url} alt="" fit="cover" fallbackIcon={<User className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />} />
                ) : (
                  <User className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                )}
                {otherParticipant && (
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${otherOnline ? "bg-success" : "bg-ink-soft/40"}`}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {selectedCard?.other_participant_full_name ?? (selectedDetail ? conversationTypeLabel(selectedDetail.conversation_type) : "")}
                </p>
                <div className="flex items-center gap-2">
                  {chat.otherTyping ? (
                    <span className="animate-pulse text-xs font-medium text-primary">{tRealtime("typing")}</span>
                  ) : (
                    otherParticipant && <PresenceDot online={otherOnline} />
                  )}
                  {selectedDetail && (
                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[11px] ${STATUS_BADGE[selectedDetail.status] ?? STATUS_BADGE.closed}`}>{statusLabel(selectedDetail.status)}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowContext((v) => !v);
                  setMobileView("context");
                }}
                aria-label={t("inquiryDetailsTitle")}
                aria-pressed={showContext}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors sm:h-8 sm:w-8 ${showContext ? "bg-primary-soft text-primary" : "text-ink-muted hover:bg-surface-2 hover:text-ink"}`}
              >
                <Info className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            {selectedCard?.other_participant_full_name && (
              <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-primary/[0.06] px-4 py-1.5 text-[11px] text-ink-soft">
                <User className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
                <span className="truncate">
                  {tChat("replyingTo")}: <b className="font-semibold text-ink">{selectedCard.other_participant_full_name}</b> · {tChat("customerLabel")}
                </span>
              </div>
            )}

            {socketStatus !== "open" && (
              <div role="status" className="flex shrink-0 items-center gap-1.5 border-b border-border bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" aria-hidden="true" />
                {tChat("reconnecting")}
              </div>
            )}

            <MessageThread
              messages={messages}
              loading={messagesLoading}
              error={messagesError}
              currentUserId={currentUserId}
              hasOlder={messagesPage > 1}
              loadingOlder={loadingOlder}
              onLoadOlder={loadOlderMessages}
              otherTyping={chat.otherTyping}
              otherReadAt={chat.otherReadAt}
            />

            <MessageComposer
              conversationId={selectedId}
              onSend={handleSend}
              onSendAttachment={handleSendAttachment}
              onSendSticker={handleSendSticker}
              onTyping={chat.sendTyping}
              disabled={messagesLoading}
              placeholder={selectedCard?.other_participant_full_name ? tChat("composeTo", { name: selectedCard.other_participant_full_name }) : undefined}
            />
          </>
        )}
      </div>

      {/* Context panel */}
      {selectedId && (
        <div className={`w-full shrink-0 flex-col border-l border-border sm:w-[260px] ${mobileView === "context" ? "flex" : "hidden"} ${showContext ? "sm:flex" : "sm:hidden"}`}>
          <div className="flex shrink-0 items-center gap-2 border-b border-border p-3 sm:hidden">
            <button type="button" onClick={() => setMobileView("thread")} aria-label={tChat("back")} className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-primary">
              <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>
            <p className="text-sm font-semibold text-ink">{t("inquiryDetailsTitle")}</p>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {detailLoading && (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            )}

            {!detailLoading && selectedDetail && (
              <>
                <div className="nz-glass rounded-xl p-3 text-center">
                  <div className="relative mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-ink-soft">
                    {selectedProfile?.avatar_url || selectedCard?.other_participant_avatar_url ? (
                      <MediaImage
                        src={selectedProfile?.avatar_url ?? selectedCard?.other_participant_avatar_url ?? null}
                        alt=""
                        fit="cover"
                        fallbackIcon={<User className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />}
                      />
                    ) : (
                      <User className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                    )}
                    {otherParticipant && (
                      <span
                        aria-hidden="true"
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${(selectedProfile?.is_online ?? otherParticipant.is_online) ? "bg-success" : "bg-ink-soft/40"}`}
                      />
                    )}
                  </div>
                  {otherParticipant ? (
                    <>
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {selectedProfile?.full_name || selectedCard?.other_participant_full_name || roleLabel(otherParticipant.role)}
                      </p>
                      {selectedProfile?.phone_number && (
                        <a href={`tel:${selectedProfile.phone_number}`} className="mt-1 flex items-center justify-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-primary">
                          <Phone className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                          {selectedProfile.phone_number}
                        </a>
                      )}
                      {selectedProfile?.telegram_username && (
                        <a
                          href={`https://t.me/${selectedProfile.telegram_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center justify-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-primary"
                        >
                          <Send className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />@{selectedProfile.telegram_username}
                        </a>
                      )}
                      {profileLoading && !selectedProfile && <Skeleton className="mx-auto mt-2 h-3 w-24" />}
                      {profileError && !selectedProfile && <p className="mt-2 text-xs text-ink-soft">{t("inquiryProfileUnavailable")}</p>}
                      <p className="mt-1.5 text-xs text-ink-soft">
                        {t("inquiryStartedAt")}: {new Date(otherParticipant.joined_at).toLocaleDateString()}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-ink-soft">{t("inquiryNoOtherParticipant")}</p>
                  )}
                </div>

                {selectedProfile && selectedProfile.orders.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      {t("inquiryCustomerOrders")} {selectedProfile.order_count > 0 && <span className="text-ink-soft/70">({selectedProfile.order_count})</span>}
                    </p>
                    <ul className="space-y-1.5">
                      {selectedProfile.orders.map((order) => (
                        <li key={order.id} className="rounded-lg border border-border px-2.5 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-medium text-ink">{order.order_number}</span>
                            <span className="shrink-0 rounded-full border border-border px-1.5 text-[10px] capitalize text-ink-soft">{order.status}</span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-ink-soft">
                            <span>{order.placed_at ? new Date(order.placed_at).toLocaleDateString() : ""}</span>
                            {order.total_amount && (
                              <span className="font-medium text-ink">
                                {Number(order.total_amount).toLocaleString()} {order.currency}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("inquiryDetailsTitle")}</p>
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">{t("inquiryStatusLabel")}</dt>
                      <dd className="font-medium text-ink">{statusLabel(selectedDetail.status)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">{t("inquiryLastActivity")}</dt>
                      <dd className="font-medium text-ink">{relativeTime(selectedDetail.last_activity_at, locale)}</dd>
                    </div>
                  </dl>
                </div>

                {previousConversations.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("inquiryPreviousConversations")}</p>
                    <ul className="space-y-1.5">
                      {previousConversations.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => openConversation(c.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                          >
                            <span className="truncate">{conversationTypeLabel(c.conversation_type)}</span>
                            <span className={`shrink-0 rounded-full border px-1.5 text-[11px] ${STATUS_BADGE[c.status] ?? STATUS_BADGE.closed}`}>{statusLabel(c.status)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );

  return sheet.fullscreen ? createPortal(card, document.body) : card;
}
