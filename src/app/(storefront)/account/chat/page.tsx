"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Bot, Check, Clock, Copy, Headset, LoaderCircle, MessageCircle, Plus, RotateCcw, Search, Send, Store as StoreIcon, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { AttachmentUpload, Conversation, ConversationDetail, Message } from "@/lib/account-api";
import { Button, Card, ErrorState, Skeleton } from "@/components/ui";
import AccountLayout from "@/components/AccountLayout";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useChatInboxSocket } from "@/hooks/useChatInboxSocket";
import { useMobileChatViewport } from "@/hooks/useMobileChatViewport";
import { MessageContentView, ReadTicks, StickerPicker, TypingIndicator, isBubbleless } from "@/components/chat/ChatBits";
import MediaAttachmentPicker from "@/components/chat/MediaAttachmentPicker";
import StoreSelector from "@/components/chat/StoreSelector";
import ConversationListItem from "@/components/chat/ConversationListItem";
import ChatHeader from "@/components/chat/ChatHeader";
import StatusFilterDropdown, { type StatusFilter } from "@/components/chat/StatusFilterDropdown";
import SupportTopics from "@/components/chat/SupportTopics";
import OrderAttachPicker from "@/components/chat/OrderAttachPicker";
import ChatRating from "@/components/chat/ChatRating";
import { isChatSoundEnabled, setChatSoundEnabled, useChatSoundEnabled } from "@/lib/chat-sound";
import { getCachedConversationStore, type CachedStoreSummary } from "@/lib/chat-store-cache";

/** Real, backend-sourced `conversation.store` always wins; the localStorage cache is only a fallback for conversations opened before `Conversation.store_id` existed (see chat-store-cache.ts's own docstring). */
function resolveConversationStore(conversation: Conversation): CachedStoreSummary | null {
  if (conversation.store) {
    const st = conversation.store;
    return { id: st.id, name: st.name, slug: st.slug, logoUrl: st.logo_url, city: st.city ?? "", district: st.district ?? "", address: st.address ?? "", isOpenNow: Boolean(st.is_open_now), color: st.color || undefined };
  }
  return getCachedConversationStore(conversation.id);
}

/** "Bugun" / "Kecha" / "21 sentabr" for the sticky date separators in a thread. */
function chatDayLabel(iso: string, today: string, yesterday: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return today;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return yesterday;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

/** A soft two-tone "ping" for a new message in another chat (Web Audio -- no sound file to ship). */
function playPing() {
  if (!isChatSoundEnabled()) return; // muted in Settings or the chat header
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext; __nzPing?: AudioContext };
    const Ctx = W.AudioContext ?? W.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (W.__nzPing ??= new Ctx());
    [880, 1320].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.09 + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.09);
      o.stop(ctx.currentTime + i * 0.09 + 0.2);
    });
  } catch {
    /* audio blocked -- the toast still shows */
  }
}

type ConversationListResult = { data: Conversation[] } | { error: "login" | "load" | "network" };

async function fetchConversationList(status: StatusFilter): Promise<ConversationListResult> {
  try {
    const res = await fetch(`/api/chat/conversations${status !== "all" ? `?status=${status}` : ""}`);
    const body = await res.json();
    if (!res.ok || !body.success) return { error: res.status === 401 ? "login" : "load" };
    return { data: body.data as Conversation[] };
  } catch {
    return { error: "network" };
  }
}

/** How close to the bottom (px) counts as "already reading the latest" -- below this, a new message auto-scrolls; above it, it only raises the "New message" pill (see spec: never force-scroll someone reading older messages). */
const NEAR_BOTTOM_THRESHOLD = 120;

/** Text to drop into the composer (a support topic); `nonce` lets the same text be applied twice. */
type ComposerPrefill = { text: string; nonce: number } | null;

function ConversationThread({ conversation, currentUserId, onBack, prefill = null }: { conversation: Conversation; currentUserId: string | null; onBack: () => void; prefill?: ComposerPrefill }) {
  const t = useTranslations("account.chatPage");
  const tCommon = useTranslations("common");
  const tChat = useTranslations("chat");
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState(prefill?.text ?? "");
  const [appliedPrefill, setAppliedPrefill] = useState(prefill?.nonce ?? 0);
  if (prefill && prefill.nonce !== appliedPrefill) {
    setAppliedPrefill(prefill.nonce);
    setDraft(prefill.text);
  }
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessageBanner, setNewMessageBanner] = useState(false);
  // Support chats: working hours + rating state (the list row doesn't carry them)
  const [support, setSupport] = useState<ConversationDetail | null>(null);
  const tRt = useTranslations("chatRealtime");
  const messageCount = messages?.length ?? 0;
  useEffect(() => {
    if (conversation.conversation_type !== "customer_support") return;
    let alive = true;
    fetch(`/api/chat/conversations/${conversation.id}`)
      .then((r) => r.json())
      .then((b) => { if (alive && b?.success) setSupport(b.data as ConversationDetail); })
      .catch(() => {});
    return () => { alive = false; };
    // re-read after new messages: a reply can reopen a closed chat, a closing asks for a rating
  }, [conversation.id, conversation.conversation_type, conversation.status, messageCount]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scrolls only the message pane. `scrollIntoView()` also scrolls every scrollable ancestor -- including the
  // page -- which on phones yanked the whole page down toward the footer while typing.
  function scrollPaneToBottom(smooth: boolean) {
    const pane = scrollRef.current;
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);
  const forceScrollRef = useRef(false);
  const pendingDraftsRef = useRef<Record<string, string>>({});

  const store = useMemo(() => resolveConversationStore(conversation), [conversation]);

  async function fetchPage(page: number): Promise<{ data: Message[]; totalPages: number } | null> {
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}/messages?page=${page}`);
      const body = await res.json();
      if (!res.ok || !body.success) return null;
      return { data: body.data as Message[], totalPages: body.pagination?.total_pages ?? 1 };
    } catch {
      return null;
    }
  }

  // Messages paginate oldest-first -- fetch page 1 first only to learn
  // total_pages, then the real last page, so the thread opens on the
  // newest messages (matches InquiriesWorkspace's own fix for the
  // identical gap on the store-owner side).
  async function fetchLatestPage(): Promise<{ data: Message[]; page: number } | null> {
    const first = await fetchPage(1);
    if (!first) return null;
    if (first.totalPages <= 1) return { data: first.data, page: 1 };
    const last = await fetchPage(first.totalPages);
    return { data: last?.data ?? first.data, page: first.totalPages };
  }

  function applyThread(result: { data: Message[]; page: number } | null) {
    if (result) {
      setMessages(result.data);
      setMessagesPage(result.page);
      stickToBottomRef.current = true;
    } else {
      setLoadError(true);
    }
    setLoading(false);
  }

  async function loadThread() {
    setLoading(true);
    setLoadError(false);
    applyThread(await fetchLatestPage());
  }

  // Switching conversations shows the loading state right away (adjusted
  // during render); the effect below then fetches the new thread.
  const [threadFor, setThreadFor] = useState(conversation.id);
  if (threadFor !== conversation.id) {
    setThreadFor(conversation.id);
    setLoading(true);
    setLoadError(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetchLatestPage().then((result) => {
      if (!cancelled) applyThread(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-runs only when switching conversations.
  }, [conversation.id]);

  async function loadOlder() {
    if (messagesPage <= 1 || loadingOlder) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    const result = await fetchPage(messagesPage - 1);
    if (result) {
      setMessages((prev) => [...result.data, ...(prev ?? [])]);
      setMessagesPage((p) => p - 1);
      // Keep the view anchored on the same messages instead of jumping to the top.
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    }
    setLoadingOlder(false);
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
    stickToBottomRef.current = atBottom;
    if (atBottom) setNewMessageBanner(false);
    if (el.scrollTop < 80) loadOlder();
  }

  function appendMessage(message: Message) {
    setMessages((prev) => {
      if (!prev) return [message];
      if (prev.some((m) => m.id === message.id)) return prev; // never append a duplicate (covers the sender's own broadcast echoing back)
      return [...prev, message];
    });
  }

  function replaceMessage(tempId: string, real: Message) {
    setMessages((prev) => {
      if (!prev) return [real];
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      if (withoutTemp.some((m) => m.id === real.id)) return withoutTemp;
      return [...withoutTemp, real];
    });
  }

  function markMessage(id: string, status: string) {
    setMessages((prev) => (prev ? prev.map((m) => (m.id === id ? { ...m, status } : m)) : prev));
  }

  useEffect(() => {
    if (!messages) return;
    if (stickToBottomRef.current || forceScrollRef.current) {
      scrollPaneToBottom(forceScrollRef.current);
      forceScrollRef.current = false;
    } else {
      setNewMessageBanner(true);
    }
  }, [messages]);

  // Real-time delivery -- the store owner's reply appears the moment it's
  // sent, no polling or manual refresh (see useChatSocket's own docstring).
  const chat = useChatSocket(conversation.id, appendMessage);
  const socketStatus = chat.status;
  const { markRead } = chat;

  // Read receipts: while this conversation is on screen and the tab is visible, the store's messages get marked read (they see ✓✓).
  const hasUnreadFromOther = Boolean(messages?.some((m) => m.sender_id !== currentUserId && !m.read_at));
  useEffect(() => {
    if (socketStatus !== "open" || !hasUnreadFromOther) return;
    const markIfVisible = () => document.visibilityState === "visible" && markRead();
    markIfVisible();
    document.addEventListener("visibilitychange", markIfVisible);
    return () => document.removeEventListener("visibilitychange", markIfVisible);
  }, [socketStatus, hasUnreadFromOther, markRead, messages]);

  async function sendSticker(code: string) {
    setError(null);
    forceScrollRef.current = true;
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_type: "sticker", content: code }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error?.message ?? t("sendError"));
        return;
      }
      appendMessage(body.data);
    } catch {
      setError(t("networkError"));
    }
  }

  async function sendText(content: string, retryId?: string) {
    const tempId = retryId ?? `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    pendingDraftsRef.current[tempId] = content;
    setSending(true);
    setError(null);
    forceScrollRef.current = true;
    if (retryId) {
      markMessage(retryId, "pending");
    } else {
      appendMessage({
        id: tempId,
        conversation_id: conversation.id,
        sender_id: currentUserId ?? "",
        message_type: "text",
        content,
        status: "pending",
        created_at: new Date().toISOString(),
        attachment_type: null,
        attachment_url: null,
        attachment_filename: null,
        attachment_size_bytes: null,
        reply_to_message_id: null,
      });
    }
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        markMessage(tempId, "failed");
        setError(body.error?.message ?? t("sendError"));
        return;
      }
      delete pendingDraftsRef.current[tempId];
      replaceMessage(tempId, body.data);
    } catch {
      markMessage(tempId, "failed");
      setError(t("networkError"));
    } finally {
      setSending(false);
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    chat.sendTyping(false);
    sendText(content);
  }

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  function handleRetry(id: string) {
    const content = pendingDraftsRef.current[id];
    if (content) sendText(content, id);
  }

  async function handleAttachment(attachment: AttachmentUpload) {
    setError(null);
    forceScrollRef.current = true;
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_type: "attachment", ...attachment }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error?.message ?? t("sendError"));
        return;
      }
      appendMessage(body.data);
    } catch {
      setError(t("networkError"));
    }
  }

  /** Puts text into the composer and focuses it, ready to edit and send. A topic replaces the draft (each is a full opening message); an order reference is appended to it. */
  function insertIntoDraft(text: string, mode: "replace" | "append" = "replace") {
    setDraft((prev) => (mode === "append" && prev.trim() ? `${prev.trimEnd()} ${text}` : text));
    window.setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, 0);
  }

  async function copyMessage(m: Message) {
    if (!m.content) return;
    try {
      await navigator.clipboard.writeText(m.content);
      setCopiedId(m.id);
      window.setTimeout(() => setCopiedId((id) => (id === m.id ? null : id)), 1500);
    } catch {
      // Clipboard blocked -- the text is still selectable.
    }
  }

  const isSupport = conversation.conversation_type === "customer_support";
  const supportStatus = support?.status ?? conversation.status;

  return (
    // `min-h-0` on this and the message pane below: real, confirmed bug --
    // a column-direction flex item's default `min-height: auto` floors it
    // at its own content size, so without this the message list (flex-1)
    // never actually shrank to the card's bounded height and scrolled
    // internally -- it grew to fit every message instead, pushing the
    // composer down past the card's own clipped bounds (invisible,
    // unreachable) and the whole page scrolled past it toward the footer.
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ChatHeader
        conversation={conversation}
        store={store}
        onBack={onBack}
        connectionStatus={socketStatus}
        liveOnline={socketStatus === "open" ? chat.otherOnline : undefined}
        typing={chat.otherTyping}
      />

      <div ref={scrollRef} onScroll={handleScroll} className="nz-chat-wallpaper relative min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="ml-auto h-9 w-2/5 rounded-lg" />
            <Skeleton className="h-9 w-1/2 rounded-lg" />
            <Skeleton className="ml-auto h-9 w-1/3 rounded-lg" />
          </div>
        ) : loadError ? (
          <ErrorState message={t("threadLoadError")} action={<Button variant="secondary" onClick={loadThread}>{tCommon("retry")}</Button>} />
        ) : !messages || messages.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-6 text-center">
            <span className="nz-glass flex h-14 w-14 items-center justify-center rounded-2xl text-primary">
              {isSupport ? <Headset className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" /> : <MessageCircle className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{t("noMessages")}</p>
              {isSupport && <p className="mt-1 text-xs text-ink-muted">{t("replyTime")}</p>}
            </div>
            {isSupport && (
              <div className="nz-glass w-full rounded-2xl p-3 text-left">
                <SupportTopics variant="cards" onPick={insertIntoDraft} disabled={sending} />
              </div>
            )}
          </div>
        ) : (
          <>
            {messagesPage > 1 && (
              <div className="flex justify-center pb-1">
                {loadingOlder ? (
                  <span className="text-xs text-ink-soft">{tCommon("loading")}</span>
                ) : (
                  <button type="button" onClick={loadOlder} className="text-xs font-medium text-primary hover:brightness-110">
                    {t("loadOlder")}
                  </button>
                )}
              </div>
            )}
            {messages.map((m, idx) => {
              const mine = m.sender_id === currentUserId;
              const day = m.created_at ? new Date(m.created_at).toDateString() : "";
              const prevDay = idx > 0 && messages[idx - 1].created_at ? new Date(messages[idx - 1].created_at!).toDateString() : "";
              const showDay = Boolean(day) && day !== prevDay;
              const dayLabel = showDay ? chatDayLabel(m.created_at!, tChat("today"), tChat("yesterday")) : "";
              const isPending = m.status === "pending";
              const isFailed = m.status === "failed";
              const bare = isBubbleless(m);
              const read = Boolean(m.read_at) || Boolean(chat.otherReadAt && m.created_at && m.created_at <= chat.otherReadAt);
              if (m.message_type === "system") {
                return (
                  <div key={m.id}>
                    {showDay && (
                      <div className="sticky top-1 z-10 flex justify-center py-1.5">
                        <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-md">{dayLabel}</span>
                      </div>
                    )}
                    <div className="animate-nz-fade-in mx-auto my-1 flex max-w-[88%] items-start gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary-soft/60 px-3.5 py-2.5 text-xs text-ink-muted">
                      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
                      <p className="whitespace-pre-wrap leading-relaxed">
                        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-primary">{tRt("autoReply")}</span>
                        {m.content}
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id}>
                {showDay && (
                  <div className="sticky top-1 z-10 flex justify-center py-1.5">
                    <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-md">{dayLabel}</span>
                  </div>
                )}
                <div className={`animate-nz-fade-in flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={
                      bare
                        ? "group/bubble max-w-[80%]"
                        : `group/bubble max-w-[80%] rounded-[18px] px-3.5 py-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.35)] ${mine ? "nz-bubble-mine rounded-br-[6px] text-white" : "nz-bubble-theirs rounded-bl-[6px] text-ink"} ${isPending ? "opacity-70" : ""} ${isFailed ? "!bg-red-600/90" : ""}`
                    }
                  >
                    <MessageContentView message={m} />
                    <p className={`group/meta mt-1 flex items-center justify-end gap-1 text-xs ${bare ? "text-ink-soft" : mine ? "text-white/75" : "text-ink-soft"}`}>
                      {m.message_type === "text" && m.content && !isPending && (
                        <button
                          type="button"
                          onClick={() => copyMessage(m)}
                          aria-label={copiedId === m.id ? t("copied") : t("copy")}
                          title={copiedId === m.id ? t("copied") : t("copy")}
                          className="mr-auto opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover/bubble:opacity-70"
                        >
                          {copiedId === m.id ? <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" /> : <Copy className="h-3 w-3" strokeWidth={2} aria-hidden="true" />}
                        </button>
                      )}
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      {mine && bare && !isPending && !isFailed && <ReadTicks read={read} />}
                      {mine && !bare && (
                        <>
                          {isPending && <Clock className="h-3 w-3" strokeWidth={2} aria-hidden="true" />}
                          {isFailed && (
                            <button type="button" onClick={() => handleRetry(m.id)} aria-label={tCommon("retry")} className="text-white hover:text-white/80">
                              <RotateCcw className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
                            </button>
                          )}
                          {!isPending && !isFailed && <ReadTicks read={read} />}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                </div>
              );
            })}
          </>
        )}
        {chat.otherTyping && <TypingIndicator />}
        <div ref={bottomRef} />

        {newMessageBanner && (
          <button
            type="button"
            onClick={() => {
              scrollPaneToBottom(true);
              setNewMessageBanner(false);
            }}
            className="nz-cta sticky bottom-2 left-1/2 mx-auto flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-lg"
          >
            {t("newMessage")}
          </button>
        )}
      </div>

      {isSupport && !draft && messages && messages.length > 0 && (
        <div className="shrink-0 border-t border-border/60 pt-2">
          <SupportTopics onPick={insertIntoDraft} disabled={sending} />
        </div>
      )}
      {isSupport && support?.can_rate && <ChatRating key={`${conversation.id}-${messageCount}`} conversationId={conversation.id} onRated={() => setSupport((d) => (d ? { ...d, can_rate: false } : d))} />}
      {isSupport && support && supportStatus !== "open" && !support.can_rate && (
        <p className="shrink-0 border-t border-border/60 px-4 py-2 text-center text-xs text-ink-muted">{tRt("closedNote")}</p>
      )}
      {isSupport && supportStatus === "open" && support?.support_hours && !support.support_hours.open && (
        <p className="shrink-0 border-t border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300" role="status">
          <Clock className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          {tRt("offHours", { hours: support.support_hours.label })}
        </p>
      )}
      <form onSubmit={handleSend} className="flex shrink-0 items-end gap-2 border-t border-border p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-3">
        <MediaAttachmentPicker conversationId={conversation.id} onAttachment={handleAttachment} disabled={sending} />
        <StickerPicker onPick={sendSticker} onPickEmoji={handleAttachment} disabled={sending} />
        <OrderAttachPicker onPick={(number) => insertIntoDraft(t("orderRef", { number }), "append")} disabled={sending} />
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          onBlur={() => chat.sendTyping(false)}
          onFocus={() => {
            if (stickToBottomRef.current) window.setTimeout(() => scrollPaneToBottom(false), 250);
          }}
          enterKeyHint="send"
          onChange={(e) => {
            setDraft(e.target.value);
            chat.sendTyping(e.target.value.trim().length > 0);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleComposerKeyDown}
          placeholder={tChat("composeTo", { name: conversation.conversation_type === "customer_sales" ? store?.name || tChat("storeConversationLabel") : tChat("supportTitle") })}
          disabled={sending}
          className="nz-glass-input max-h-[120px] min-w-0 flex-1 resize-none rounded-2xl px-3.5 py-2 text-base leading-relaxed sm:rounded-lg sm:text-sm"
        />
        <Button type="submit" variant="primary" disabled={sending || !draft.trim()} aria-label={t("send")}>
          <Send className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </form>
      {error && (
        <p role="alert" className="px-4 pb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/** `useSearchParams` (the `?conversation=` deep link from MessageStoreButton) requires a Suspense boundary in production builds -- see next/navigation's own docs. */
export default function ChatPage() {
  return (
    <Suspense fallback={<AccountLayout><Skeleton className="h-64 w-full" /></AccountLayout>}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const t = useTranslations("account.chatPage");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const tChat = useTranslations("chat");
  const [toast, setToast] = useState<{ id: string; name: string; text: string } | null>(null);
  const activeConversationRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationRef.current = activeConversation?.id ?? null;
    if (!activeConversation) return;
    // the thread marks messages read on the server -- let the menu badges catch up a moment later
    const id = window.setTimeout(() => window.dispatchEvent(new Event("nz:chat-read")), 1500);
    return () => window.clearTimeout(id);
  }, [activeConversation]);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [storeSelectorOpen, setStoreSelectorOpen] = useState(false);
  const [openingSupport, setOpeningSupport] = useState(false);
  const [prefill, setPrefill] = useState<ComposerPrefill>(null);
  const soundOn = useChatSoundEnabled();
  // Bumped every time a store is picked, so each ConversationListItem re-reads its (per-browser) cached store summary.
  const [storeCacheVersion, setStoreCacheVersion] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => {
        if (body?.success) setCurrentUserId(body.data.id);
      })
      .catch(() => {});
  }, []);

  function applyConversationList(result: ConversationListResult): Conversation[] | null {
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return null;
    }
    setConversations(result.data);
    return result.data;
  }

  async function loadConversations(status: StatusFilter) {
    setLoading(true);
    setError(null);
    return applyConversationList(await fetchConversationList(status));
  }

  function selectStatus(status: StatusFilter) {
    if (status === statusFilter) return;
    setStatusFilter(status);
    loadConversations(status);
  }

  // Initial list (loading already starts true); filter changes load from selectStatus().
  useEffect(() => {
    let cancelled = false;
    fetchConversationList("all").then((result) => {
      if (!cancelled) applyConversationList(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Real, closed gap: a reply landing in a conversation the customer
  // isn't currently looking at (sitting on this list, or a different
  // thread) never showed up here short of a manual reload -- see
  // useChatInboxSocket's own docstring. Re-fetches the real list over
  // the same REST endpoint `loadConversations` already uses.
  useChatInboxSocket(!!currentUserId, (conversationId) => {
    loadConversations(statusFilter).then((list) => {
      if (!list || conversationId === activeConversationRef.current) return;
      const c = list.find((x) => x.id === conversationId);
      if (!c || !c.unread_count || c.last_message?.is_mine) return;
      const store = resolveConversationStore(c);
      const name = c.conversation_type === "customer_sales" ? store?.name ?? tChat("storeConversationLabel") : tChat("supportTitle");
      setToast({ id: c.id, name, text: c.last_message?.content || tChat("attachmentPreview") });
      playPing();
    });
  });

  useEffect(() => {
    const deepLinkId = searchParams.get("conversation");
    if (!deepLinkId || activeConversation) return;
    (async () => {
      const match = conversations?.find((c) => c.id === deepLinkId);
      if (match) {
        setActiveConversation(match);
        return;
      }
      if (!conversations) return; // still loading the first list -- wait for it.
      // Opened from a store page just now, before the list above ever fetched it -- load it directly by id.
      try {
        const res = await fetch(`/api/chat/conversations/${deepLinkId}`);
        const body = await res.json();
        if (body?.success) setActiveConversation(body.data as ConversationDetail);
      } catch {
        // The deep-linked conversation just won't open -- the inbox list below still works.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-checks once the list itself changes.
  }, [conversations]);

  /** Opens (or reuses -- the backend returns the existing one) the customer's NutriZone Support chat, optionally pre-filling the composer. */
  async function openSupport(text?: string) {
    if (openingSupport) return;
    const existing = conversations?.find((c) => c.conversation_type === "customer_support" && c.status !== "archived");
    if (text) setPrefill({ text, nonce: Date.now() });
    if (existing) {
      setActiveConversation(existing);
      return;
    }
    setOpeningSupport(true);
    try {
      const res = await fetch("/api/chat/conversations", { method: "POST" });
      const body = await res.json();
      if (res.ok && body?.success) {
        const conversation = body.data as ConversationDetail;
        setConversations((prev) => (prev ? (prev.some((c) => c.id === conversation.id) ? prev : [conversation, ...prev]) : [conversation]));
        setActiveConversation(conversation);
      }
    } catch {
      // The list stays as it is; the customer can retry.
    } finally {
      setOpeningSupport(false);
    }
  }

  function handleStoreSelected(conversation: ConversationDetail, _store: CachedStoreSummary) {
    setStoreSelectorOpen(false);
    setStoreCacheVersion((v) => v + 1);
    setConversations((prev) => {
      if (!prev) return [conversation];
      if (prev.some((c) => c.id === conversation.id)) return prev;
      return [conversation, ...prev];
    });
    setActiveConversation(conversation);
  }

  const filteredConversations = conversations
    ?.filter((c) => {
      if (!searchQuery.trim()) return true;
      const store = resolveConversationStore(c);
      const title = c.conversation_type === "customer_sales" ? store?.name ?? "" : tChat("supportTitle");
      return title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    })
    .slice()
    .sort((a, b) => {
      const pa = a.conversation_type === "customer_support" ? 1 : 0;
      const pb = b.conversation_type === "customer_support" ? 1 : 0;
      if (pa !== pb) return pb - pa; // the one NutriZone Support chat stays pinned on top
      return (b.last_message?.created_at ?? b.last_activity_at ?? "").localeCompare(a.last_message?.created_at ?? a.last_activity_at ?? "");
    });
  const unreadTotal = (conversations ?? []).reduce((n, c) => n + (c.id === activeConversation?.id ? 0 : c.unread_count ?? 0), 0);

  const sheet = useMobileChatViewport(!!activeConversation);

  if (loading && !conversations) {
    return (
      <AccountLayout>
        <Skeleton className="mb-6 h-8 w-40" />
        <Skeleton className="h-[70vh] w-full" />
      </AccountLayout>
    );
  }

  if (error) {
    return (
      <AccountLayout>
        <ErrorState
          message={error === "login" ? t("loginPrompt") : t("loadError")}
          action={
            error === "login" ? (
              <Link href="/login?next=/account/chat">
                <Button variant="primary">{t("goToLogin")}</Button>
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => loadConversations(statusFilter)}>
                {tCommon("retry")}
              </Button>
            )
          }
        />
      </AccountLayout>
    );
  }

  const hasAnyConversation = !!conversations && conversations.length > 0;
  // On phones an open conversation is a full-screen sheet rendered into <body>: glass/animated ancestors
  // (backdrop-filter / transform) would otherwise become the containing block of `position: fixed`.
  const chatCard = (
    <Card
      className={
        sheet.fullscreen
          ? "fixed inset-x-0 top-0 z-[70] flex h-[100dvh] overflow-hidden rounded-none border-0 bg-bg p-0 backdrop-blur-none"
          : "flex h-[calc(100dvh-11rem)] min-h-[440px] max-h-[820px] overflow-hidden p-0 sm:h-[75vh] sm:min-h-[520px]"
      }
      style={sheet.style}
    >
      <div className={`w-full shrink-0 flex-col border-r border-border sm:w-[320px] ${activeConversation ? "hidden sm:flex" : "flex"}`}>
        <div className="flex shrink-0 items-center gap-2 border-b border-border p-3">
          <StatusFilterDropdown value={statusFilter} onChange={selectStatus} />
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchConversations")}
              aria-label={t("searchConversations")}
              className="nz-glass-input w-full rounded-full py-1.5 pl-7 pr-2 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" key={storeCacheVersion}>
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations && filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <AlertCircle className="h-7 w-7 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />
              <p className="text-sm text-ink-soft">{t("noConversationsForFilter")}</p>
            </div>
          ) : (
            <ul>
              {filteredConversations?.map((c) => (
                <li key={c.id}>
                  <ConversationListItem
                    // opening a chat reads it: its counter clears at once (the thread marks the messages read on the server)
                    conversation={c.id === activeConversation?.id ? { ...c, unread_count: 0 } : c}
                    store={resolveConversationStore(c)}
                    active={activeConversation?.id === c.id}
                    onClick={() => setActiveConversation(c)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={`min-w-0 flex-1 flex-col ${activeConversation ? "flex" : "hidden sm:flex"}`}>
        {!activeConversation ? (
          <div className="nz-chat-wallpaper flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
            <div className="w-full max-w-md text-center">
              <span className="nz-glass mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-primary">
                <MessageCircle className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <p className="mt-4 text-base font-semibold text-ink">{t("selectConversationTitle")}</p>
              <p className="mt-1 text-sm text-ink-muted">{t("selectConversationHint")}</p>
              <div className="nz-glass mt-5 rounded-2xl p-3 text-left">
                <SupportTopics variant="cards" onPick={(text) => openSupport(text)} disabled={openingSupport} />
              </div>
            </div>
          </div>
        ) : (
          <ConversationThread conversation={activeConversation} currentUserId={currentUserId} onBack={() => setActiveConversation(null)} prefill={prefill} />
        )}
      </div>
    </Card>
  );

  return (
    <AccountLayout>
      <section className={`nz-glass nz-rise relative mb-6 overflow-hidden rounded-3xl ${activeConversation ? "hidden sm:block" : ""}`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_0%_0%,rgba(var(--nz-primary-rgb),0.18),transparent_60%)]" />
          <div className="nz-orb -right-16 -top-24 h-56 w-56 bg-[color-mix(in_srgb,#10b981_22%,transparent)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--nz-primary-rgb),0.5)] to-transparent" />
        </div>
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="nz-cta relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
              <MessageCircle className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
              {unreadTotal > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white ring-2 ring-surface" title={tChat("unreadTotal", { count: unreadTotal })}>
                  {unreadTotal > 99 ? "99+" : unreadTotal}
                </span>
              )}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
              <p className="mt-0.5 text-sm text-ink-muted">{t("heroSubtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChatSoundEnabled(!soundOn)}
              aria-label={soundOn ? t("soundOn") : t("soundOff")}
              title={soundOn ? t("soundOn") : t("soundOff")}
              aria-pressed={!soundOn}
              className="nz-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:text-ink"
            >
              {soundOn ? <Volume2 className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden="true" /> : <VolumeX className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden="true" />}
            </button>
            <Button variant="secondary" onClick={() => openSupport()} disabled={openingSupport} className="flex-1 sm:flex-none">
              {openingSupport ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Headset className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
              {openingSupport ? t("openingSupport") : t("contactSupport")}
            </Button>
            <Button variant="primary" onClick={() => setStoreSelectorOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
              {t("contactStore")}
            </Button>
          </div>
        </div>
      </section>

      {!hasAnyConversation ? (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => openSupport()}
            disabled={openingSupport}
            className="group relative overflow-hidden rounded-3xl bg-[linear-gradient(150deg,color-mix(in_srgb,var(--nz-primary)_92%,black),color-mix(in_srgb,var(--nz-primary)_55%,#0e9f5f))] p-6 text-left text-white shadow-[0_24px_48px_-24px_rgba(var(--nz-primary-rgb),0.8)] transition-transform hover:-translate-y-1 disabled:opacity-70"
          >
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              {openingSupport ? <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden="true" /> : <Headset className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />}
            </span>
            <p className="relative mt-4 text-lg font-bold">{t("supportCardTitle")}</p>
            <p className="relative mt-1 text-sm text-white/80">{t("supportCardText")}</p>
            <p className="relative mt-3 flex items-center gap-1.5 text-xs font-medium text-white/75">
              <span className="nz-pulse-dot h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" />
              {t("replyTime")}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setStoreSelectorOpen(true)}
            className="nz-glass nz-glass-interactive group rounded-3xl p-6 text-left"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <StoreIcon className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <p className="mt-4 text-lg font-bold text-ink">{t("storeCardTitle")}</p>
            <p className="mt-1 text-sm text-ink-muted">{t("storeCardText")}</p>
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {t("contactStore")}
            </p>
          </button>
          <div className="nz-glass rounded-3xl p-5 md:col-span-2">
            <SupportTopics variant="cards" onPick={(text) => openSupport(text)} disabled={openingSupport} />
          </div>
        </div>
      ) : (
        sheet.fullscreen ? createPortal(chatCard, document.body) : chatCard
      )}

      {toast && (
        <button
          type="button"
          onClick={() => {
            const c = conversations?.find((x) => x.id === toast.id);
            if (c) setActiveConversation(c);
            setToast(null);
          }}
          className="nz-glass-strong animate-nz-fade-in fixed right-4 top-20 z-[80] flex w-[min(92vw,340px)] items-start gap-3 rounded-2xl p-3.5 text-left shadow-2xl"
          role="status"
        >
          <span className="nz-cta flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white">
            <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink">{tChat("newMessageFrom", { name: toast.name })}</span>
            <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">{toast.text}</span>
          </span>
        </button>
      )}

      <StoreSelector open={storeSelectorOpen} onClose={() => setStoreSelectorOpen(false)} onSelected={handleStoreSelected} />
    </AccountLayout>
  );
}
