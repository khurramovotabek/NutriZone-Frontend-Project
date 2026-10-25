"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Message } from "@/lib/account-api";
import { Skeleton } from "@/components/ui";
import { MessageContentView, ReadTicks, TypingIndicator, isBubbleless } from "@/components/chat/ChatBits";

interface MessageGroupData {
  senderId: string;
  mine: boolean;
  messages: Message[];
}

interface DaySection {
  dateKey: string;
  date: Date;
  groups: MessageGroupData[];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** "today" / "yesterday" relative to now, or null for any older day. */
function relativeDay(date: Date): "today" | "yesterday" | null {
  const now = new Date();
  if (isSameDay(date, now)) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return isSameDay(date, yesterday) ? "yesterday" : null;
}

function buildSections(messages: Message[], currentUserId: string | null): DaySection[] {
  const sections: DaySection[] = [];
  for (const m of messages) {
    const created = m.created_at ? new Date(m.created_at) : new Date();
    const dateKey = created.toDateString();
    let section = sections[sections.length - 1];
    if (!section || section.dateKey !== dateKey) {
      section = { dateKey, date: created, groups: [] };
      sections.push(section);
    }
    const lastGroup = section.groups[section.groups.length - 1];
    if (lastGroup && lastGroup.senderId === m.sender_id) {
      lastGroup.messages.push(m);
    } else {
      section.groups.push({ senderId: m.sender_id, mine: m.sender_id === currentUserId, messages: [m] });
    }
  }
  return sections;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Message content, timestamp per bubble, sender-side alignment, and
 * intra-day grouping -- all real, correct fixes over the previous
 * implementation (which rendered every message identically regardless
 * of sender, since `sender_id` was fetched but never compared against
 * the viewer's own id). No delivered/read ticks are shown: the real
 * `Message` model has `delivered_at`/`read_at` columns, but the HTTP
 * read serializer this page calls never exposes them (confirmed
 * directly against `MessageSerializer`) -- inventing a checkmark here
 * would be exactly the fabricated status this project forbids.
 */
export default function MessageThread({
  messages,
  loading,
  error,
  currentUserId,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  otherTyping = false,
  otherReadAt = null,
}: {
  messages: Message[] | null;
  loading: boolean;
  error: boolean;
  currentUserId: string | null;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  /** The other participant is typing right now (live, from the socket). */
  otherTyping?: boolean;
  /** Live read receipt: the other side read everything sent up to this time. */
  otherReadAt?: string | null;
}) {
  const t = useTranslations("myStore");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);
  const prevLastId = useRef<string | null>(null);

  // Scrolls only the message pane -- `scrollIntoView()` also scrolls every scrollable ancestor, which on phones
  // dragged the whole dashboard page toward the footer while typing.
  function scrollPaneToBottom(smooth: boolean) {
    const pane = scrollRef.current;
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  // Auto-scrolls to the newest message when a conversation first loads,
  // or when a genuinely NEW message arrives while the viewer is already
  // near the bottom. If they've scrolled up to read older messages,
  // never yanks them back down -- shows a "New messages" jump button
  // instead, per this workspace's own explicit scroll-behavior rule.
  // The typing bubble appearing at the bottom keeps the view pinned there, like a new message would.
  useEffect(() => {
    if (!otherTyping) return;
    const container = scrollRef.current;
    if (container && container.scrollHeight - container.scrollTop - container.clientHeight < 160) scrollPaneToBottom(true);
  }, [otherTyping]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const lastId = messages[messages.length - 1]?.id ?? null;
    const isNewArrival = prevLastId.current !== null && lastId !== prevLastId.current;
    prevLastId.current = lastId;

    const container = scrollRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;

    if (!isNewArrival || nearBottom) {
      scrollPaneToBottom(isNewArrival);
      setShowJump(false);
    } else {
      setShowJump(true);
    }
  }, [messages]);

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (nearBottom) setShowJump(false);
  }

  function jumpToLatest() {
    scrollPaneToBottom(true);
    setShowJump(false);
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 overflow-hidden p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <Skeleton className={`h-10 w-2/3 max-w-xs rounded-xl ${i % 2 === 0 ? "" : ""}`} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="flex flex-1 items-center justify-center text-sm text-ink-muted">{t("inquiryMessagesLoadError")}</p>;
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-ink-soft">
        <MessageCircle className="h-9 w-9" strokeWidth={1.25} aria-hidden="true" />
        <p className="text-sm">{t("inquiryNoMessages")}</p>
      </div>
    );
  }

  const sections = buildSections(messages, currentUserId);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={scrollRef} onScroll={handleScroll} className="nz-chat-wallpaper h-full space-y-5 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {hasOlder && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={loadingOlder}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
            >
              {loadingOlder ? t("inquirySending") : t("inquiryLoadOlder")}
            </button>
          </div>
        )}

        {sections.map((section) => (
          <div key={section.dateKey} className="space-y-3">
            <div className="flex items-center justify-center">
              <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-md">
                {relativeDay(section.date) === "today"
                  ? t("inquiryDateToday")
                  : relativeDay(section.date) === "yesterday"
                    ? t("inquiryDateYesterday")
                    : section.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>

            {section.groups.map((group, gi) => (
              <div key={gi} className={`flex flex-col gap-1 ${group.mine ? "items-end" : "items-start"}`}>
                {group.messages.map((m, mi) => {
                  const bare = isBubbleless(m);
                  const read = Boolean(m.read_at) || Boolean(otherReadAt && m.created_at && m.created_at <= otherReadAt);
                  const last = mi === group.messages.length - 1;
                  return (
                    <div
                      key={m.id}
                      className={`animate-nz-fade-in ${
                        bare
                          ? "max-w-[80%] sm:max-w-[65%]"
                          : `max-w-[80%] px-3.5 py-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.35)] sm:max-w-[65%] ${
                              group.mine ? `nz-bubble-mine text-white ${last ? "rounded-[18px] rounded-br-[6px]" : "rounded-[18px]"}` : `nz-bubble-theirs text-ink ${last ? "rounded-[18px] rounded-bl-[6px]" : "rounded-[18px]"}`
                            }`
                      }`}
                    >
                      <MessageContentView message={m} />
                      {last && (
                        <p className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${bare ? "text-ink-soft" : group.mine ? "text-white/75" : "text-ink-soft"}`}>
                          {formatTime(m.created_at)}
                          {group.mine && <ReadTicks read={read} />}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
        {otherTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {showJump && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="nz-cta absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg"
        >
          {t("inquiryJumpToLatest")}
          <ArrowDown className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
