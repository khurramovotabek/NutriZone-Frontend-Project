"use client";

import { useEffect, useRef, useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import { createPortal } from "react-dom";
import { LoaderCircle, Star, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReviewCard } from "@/lib/reviews-api";
import { Button } from "@/components/ui";

interface Props {
  review: ReviewCard;
  onClose: () => void;
  onSaved: (updated: ReviewCard) => void;
  onDeleted: (reviewId: string) => void;
}

/**
 * The customer's own "edit/delete my review" floating dialog --
 * portaled to <body>, mirrors ImageLightbox.tsx's own established
 * dialog pattern (scroll lock, Escape-to-close, backdrop click,
 * focus-on-open) rather than inventing a second one. Reuses the real,
 * existing `EditReview`/`WithdrawReview` backend capabilities -- a
 * withdrawn review is a soft, terminal status change (never a hard
 * delete), which is exactly why it's the real "delete my review"
 * action here: the backend has no separate hard-delete endpoint.
 */
export default function ReviewEditModal({ review, onClose, onSaved, onDeleted }: Props) {
  const t = useTranslations("reviews");
  const tCommon = useTranslations("common");
  const mounted = useIsClient();
  const [title, setTitle] = useState(review.title ?? "");
  const [body, setBody] = useState(review.body ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "deleting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSave() {
    if (!body.trim() || state === "saving" || state === "deleting") return;
    setState("saving");
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), title: title.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message ?? t("editError"));
        setState("error");
        return;
      }
      onSaved(data.data as ReviewCard);
    } catch {
      setError(t("networkError"));
      setState("error");
    }
  }

  async function handleDelete() {
    if (state === "saving" || state === "deleting") return;
    setState("deleting");
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${review.id}/withdraw`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message ?? t("deleteError"));
        setState("error");
        return;
      }
      onDeleted(review.id);
    } catch {
      setError(t("networkError"));
      setState("error");
    }
  }

  if (!mounted) return null;

  const busy = state === "saving" || state === "deleting";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("editReviewTitle")}
      className="animate-nz-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="nz-glass-strong w-full max-w-md rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{t("editReviewTitle")}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={tCommon("close")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:text-primary disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {!confirmingDelete ? (
          <>
            <div className="mb-3 flex items-center gap-1" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`h-4 w-4 ${review.rating >= star ? "fill-amber-400 text-amber-400" : "text-ink-soft"}`} strokeWidth={0} />
              ))}
              <span className="ml-1 text-xs text-ink-soft">{t("ratingCannotBeChanged")}</span>
            </div>

            <label htmlFor="edit-review-title" className="mb-1.5 block text-sm font-medium text-ink-muted">
              {t("reviewTitle")}
            </label>
            <input
              id="edit-review-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy}
              className="nz-glass-input mb-3 w-full rounded-lg px-3 py-2 text-sm"
            />

            <label htmlFor="edit-review-body" className="mb-1.5 block text-sm font-medium text-ink-muted">
              {t("reviewBody")}
            </label>
            <textarea
              id="edit-review-body" value={body} onChange={(e) => setBody(e.target.value)} disabled={busy} rows={4}
              className="nz-glass-input w-full rounded-lg px-3 py-2 text-sm"
            />

            {error && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
                className="flex items-center gap-1.5 text-sm font-medium text-red-600 transition-colors hover:text-red-700 disabled:opacity-50 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                {t("deleteReview")}
              </button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                  {tCommon("cancel")}
                </Button>
                <Button type="button" onClick={handleSave} disabled={busy || !body.trim()}>
                  {state === "saving" && <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />}
                  {state === "saving" ? t("saving") : t("saveChanges")}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-muted">{t("deleteConfirm")}</p>
            {error && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={busy}>
                {tCommon("cancel")}
              </Button>
              <Button type="button" onClick={handleDelete} disabled={busy} className="!bg-red-600 hover:!brightness-110">
                {state === "deleting" && <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />}
                {state === "deleting" ? t("deleting") : t("deleteReview")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
