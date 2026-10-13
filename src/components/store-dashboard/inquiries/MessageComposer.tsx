"use client";

import { useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AttachmentUpload } from "@/lib/account-api";
import MediaAttachmentPicker from "@/components/chat/MediaAttachmentPicker";
import { StickerPicker } from "@/components/chat/ChatBits";

/**
 * Real composer -- text plus the shared `MediaAttachmentPicker`
 * (image/video upload and stickers). Previously text-only because the
 * message READ shape never returned attachment fields; that read-side
 * gap is now closed (`MessageSerializer`/`_message_payload` return
 * `attachment_*`), so this half can honestly exist too.
 */
export default function MessageComposer({
  conversationId,
  onSend,
  onSendAttachment,
  onSendSticker,
  onTyping,
  disabled,
  placeholder,
}: {
  conversationId: string;
  onSend: (content: string) => Promise<boolean>;
  onSendAttachment: (attachment: AttachmentUpload) => Promise<boolean>;
  onSendSticker: (code: string) => Promise<boolean>;
  /** Live "typing..." signal to the other side (the socket hook dedupes repeats). */
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  /** Names who the reply goes to, e.g. "Ali Valiyev ga javob yozing…". */
  placeholder?: string;
}) {
  const t = useTranslations("myStore");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    setError(null);
    onTyping?.(false);
    const ok = await onSend(trimmed);
    setSending(false);
    if (ok) {
      setDraft("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } else {
      // The draft is deliberately preserved on failure (never cleared) --
      // per this workspace's own requirement to never lose a typed
      // reply on a transient error.
      setError(t("inquirySendError"));
    }
  }

  async function handleSticker(code: string) {
    setError(null);
    const ok = await onSendSticker(code);
    if (!ok) setError(t("inquirySendError"));
  }

  async function handleAttachment(attachment: AttachmentUpload) {
    setError(null);
    const ok = await onSendAttachment(attachment);
    if (!ok) setError(t("inquirySendError"));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="shrink-0 border-t border-border p-3" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
      <div className="nz-glass-input flex items-end gap-2 rounded-xl p-1.5">
        <MediaAttachmentPicker conversationId={conversationId} onAttachment={handleAttachment} disabled={disabled} />
        <StickerPicker onPick={handleSticker} onPickEmoji={handleAttachment} disabled={disabled} />
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onTyping?.(e.target.value.trim().length > 0);
          }}
          onBlur={() => onTyping?.(false)}
          onKeyDown={handleKeyDown}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
          }}
          placeholder={placeholder ?? t("inquiryMessagePlaceholder")}
          aria-label={t("inquiryMessagePlaceholder")}
          disabled={disabled}
          rows={1}
          className="max-h-32 min-h-[2.25rem] flex-1 resize-none overflow-y-auto bg-transparent px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || sending || !draft.trim()}
          aria-label={t("inquiryMessagePlaceholder")}
          className="nz-cta flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" /> : <Send className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1">
        <p className="hidden text-[11px] text-ink-soft sm:block">{t("inquiryKeyboardHint")}</p>
        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
