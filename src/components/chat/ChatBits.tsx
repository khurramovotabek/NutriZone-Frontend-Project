"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Smile } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Message } from "@/lib/account-api";
import type { AttachmentUpload } from "@/lib/account-api";
import { EMOJI_STICKERS, STICKERS, emojiStickerAttachment, findSticker, stickerLabel, type StickerCode } from "@/lib/chat-stickers";
import AttachmentBubble from "@/components/chat/AttachmentBubble";
import ChatCardView from "@/components/chat/ChatCardView";

/**
 * Shared chat building blocks used by both sides of a conversation (the
 * customer's chat page and the store owner's inquiries workspace), so a
 * sticker, a read receipt or the typing indicator looks the same wherever
 * it appears.
 */

/** Attachments and stickers render as their own card; only text sits inside a colored bubble. */
export function isBubbleless(m: Message): boolean {
  return Boolean(m.attachment_url) || m.message_type === "sticker" || m.message_type === "card";
}

export function MessageContentView({ message }: { message: Message }) {
  if (message.message_type === "sticker") return <StickerView code={message.content} />;
  if (message.message_type === "card") return <ChatCardView card={message.card} />;
  if (message.attachment_url) return <AttachmentBubble message={message} />;
  return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>;
}

export function StickerView({ code, size = "md" }: { code: string | null; size?: "sm" | "md" }) {
  const locale = useLocale();
  const sticker = findSticker(code);
  if (!sticker) return <p className="text-sm italic text-ink-soft">{code}</p>;
  const label = stickerLabel(sticker, locale);
  const box = size === "sm" ? "h-[88px] w-[88px] rounded-2xl" : "h-32 w-32 rounded-3xl";
  return (
    <div role="img" aria-label={label} className={`relative flex ${box} select-none flex-col items-center justify-center gap-1 overflow-hidden bg-gradient-to-br ${sticker.gradient} p-2 text-center shadow-lg ring-1 ring-white/20`}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/20 blur-md" />
      <span aria-hidden="true" className={`${size === "sm" ? "text-3xl" : "text-5xl"} drop-shadow-md`}>
        {sticker.emoji}
      </span>
      <span className={`font-extrabold leading-tight tracking-tight text-white drop-shadow ${size === "sm" ? "text-[10px]" : "text-xs"}`}>{label}</span>
    </div>
  );
}

/** ✓ sent · ✓✓ read (blue once the other side has read it). */
export function ReadTicks({ read, className = "" }: { read: boolean; className?: string }) {
  const t = useTranslations("chatRealtime");
  return read ? (
    <CheckCheck className={`h-3.5 w-3.5 text-sky-400 ${className}`} strokeWidth={2.25} aria-label={t("read")} />
  ) : (
    <Check className={`h-3.5 w-3.5 ${className}`} strokeWidth={2.25} aria-label={t("sent")} />
  );
}

export function TypingIndicator({ label }: { label?: string }) {
  const t = useTranslations("chatRealtime");
  return (
    <div className="flex items-end gap-2" role="status" aria-live="polite">
      <div className="nz-glass flex items-center gap-1 rounded-2xl rounded-bl-md px-3.5 py-2.5" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
      <span className="pb-1 text-[11px] text-ink-soft">{label ?? t("typing")}</span>
    </div>
  );
}

/** Two sets in one picker: "Sales" (typed sticker messages) and the original emoji SVGs (sent as image attachments via `onPickEmoji`). */
export function StickerPicker({ onPick, onPickEmoji, disabled }: { onPick: (code: StickerCode) => void; onPickEmoji?: (attachment: AttachmentUpload) => void; disabled?: boolean }) {
  const t = useTranslations("chatRealtime");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"sales" | "emoji">("sales");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label={t("stickers")}
        aria-expanded={open}
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${open ? "bg-primary-soft text-primary" : "text-ink-soft hover:bg-surface-2 hover:text-primary"}`}
      >
        <Smile className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <div role="dialog" aria-label={t("stickers")} className="nz-glass-strong animate-nz-fade-in absolute bottom-12 left-0 z-30 w-[min(92vw,21rem)] rounded-2xl p-3 shadow-2xl">
          <div className="mb-2.5 flex items-center gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
            {(["sales", ...(onPickEmoji ? ["emoji"] : [])] as ("sales" | "emoji")[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${tab === key ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
              >
                {key === "sales" ? t("salesStickers") : t("emojiStickers")}
              </button>
            ))}
          </div>
          {tab === "sales" ? (
            <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-0.5">
              {STICKERS.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => {
                    onPick(s.code);
                    setOpen(false);
                  }}
                  className="flex justify-center rounded-2xl p-0.5 transition-transform duration-150 hover:scale-105 focus-visible:scale-105 active:scale-95"
                >
                  <StickerView code={s.code} size="sm" />
                </button>
              ))}
            </div>
          ) : (
            <div className="grid max-h-72 grid-cols-5 gap-1.5 overflow-y-auto">
              {EMOJI_STICKERS.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => {
                    onPickEmoji?.(emojiStickerAttachment(s.slug, s.sizeBytes));
                    setOpen(false);
                  }}
                  className="flex aspect-square items-center justify-center rounded-xl transition-all duration-150 hover:scale-110 hover:bg-surface-2 active:scale-95"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, tiny original SVG set */}
                  <img src={`/stickers/${s.slug}.svg`} alt={s.slug} className="h-10 w-10" draggable={false} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** "online" / "offline" pill for a conversation header. */
export function PresenceDot({ online }: { online: boolean }) {
  const t = useTranslations("chatRealtime");
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${online ? "text-success" : "text-ink-soft"}`}>
      <span className={`h-2 w-2 rounded-full ${online ? "bg-success shadow-[0_0_0_3px_rgba(34,197,94,0.2)]" : "bg-ink-soft/50"}`} aria-hidden="true" />
      {online ? t("online") : t("offline")}
    </span>
  );
}
