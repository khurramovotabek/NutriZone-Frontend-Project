"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AttachmentUpload } from "@/lib/account-api";


/** A shopper closing a real deal ("oldi-sotti") often has several product/payment/delivery photos to send at once -- capped so one accidental "select all" from a phone's camera roll doesn't fire dozens of sequential uploads. */
const MAX_ATTACHMENTS_PER_BATCH = 10;

export default function MediaAttachmentPicker({
  conversationId,
  onAttachment,
  disabled,
}: {
  conversationId: string;
  onAttachment: (attachment: AttachmentUpload) => void | Promise<void>;
  disabled?: boolean;
}) {
  const t = useTranslations("chat");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multiple real photos/videos, uploaded and sent one at a time in the
  // order picked -- each still becomes its own real message (the
  // backend's Message model has exactly one attachment field, never a
  // list), exactly how a burst of photos already reads in every real
  // chat app. One bad file in the middle of a batch never silently
  // drops every file after it -- the loop keeps going and reports the
  // one failure.
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const allFiles = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (allFiles.length === 0 || uploading) return;
    const files = allFiles.slice(0, MAX_ATTACHMENTS_PER_BATCH);
    const truncated = allFiles.length > files.length;
    setError(truncated ? t("tooManyAttachments", { max: MAX_ATTACHMENTS_PER_BATCH }) : null);
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch(`/api/chat/conversations/${conversationId}/attachments`, { method: "POST", body: formData });
          const body = await res.json();
          if (!res.ok || !body.success) {
            setError(t("attachmentUploadError"));
            continue;
          }
          await onAttachment(body.data as AttachmentUpload);
        } catch {
          setError(t("attachmentUploadError"));
        }
      }
    } finally {
      setUploading(false);
    }
  }


  return (
    <div className="relative flex items-center gap-1">
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        aria-label={t("attachMedia")}
        className="flex h-9 w-8 sm:w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" strokeWidth={1.75} aria-hidden="true" /> : <ImageIcon className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />}
      </button>

      {error && (
        <p role="alert" className="absolute -bottom-5 left-0 whitespace-nowrap text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

    </div>
  );
}
