"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Film, Plus, Star, X } from "lucide-react";
import { Button } from "@/components/ui";

interface Props {
  productId: string;
  onSubmitted?: () => void;
}

type FlowState = "idle" | "submitting" | "success" | "error";

interface PendingMedia {
  file: File;
  previewUrl: string;
  mediaType: "image" | "video";
}

/**
 * Real, closed bug: this form used to collect a "Photo URL" text
 * input and send it as `{media_type, url}` JSON -- the real backend
 * endpoint (`AttachReviewMediaView`) only ever accepted real
 * `multipart/form-data` with a `file_upload` FileField (confirmed
 * directly against the source); every prior submission silently
 * 422'd and was swallowed as "non-critical". Real file selection +
 * upload now, via the same endpoint, multiple images/video supported.
 */
export default function ReviewForm({ productId, onSubmitted }: Props) {
  const router = useRouter();
  const t = useTranslations("reviews");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [state, setState] = useState<FlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      for (const m of media) URL.revokeObjectURL(m.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const added: PendingMedia[] = files
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((f) => ({ file: f, previewUrl: URL.createObjectURL(f), mediaType: f.type.startsWith("video/") ? "video" : "image" }));
    setMedia((prev) => [...prev, ...added]);
  }

  function removeMedia(index: number) {
    setMedia((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    if (rating < 1) {
      setError(t("ratingRequired"));
      return;
    }
    if (!body.trim()) {
      setError(t("bodyRequired"));
      return;
    }

    setState("submitting");
    setError(null);
    setMediaWarning(null);

    try {
      const createRes = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, rating, body, title: title.trim() || undefined }),
      });
      const createBody = await createRes.json();
      if (!createRes.ok || !createBody.success) {
        if (createRes.status === 401) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setError(createBody.error?.message ?? t("submitError"));
        setState("error");
        return;
      }
      const reviewId = createBody.data.id as string;

      let failedUploads = 0;
      for (const item of media) {
        const formData = new FormData();
        formData.set("media_type", item.mediaType);
        formData.set("file_upload", item.file, item.file.name);
        const mediaRes = await fetch(`/api/reviews/${reviewId}/media`, { method: "POST", body: formData }).catch(() => null);
        if (!mediaRes || !mediaRes.ok) failedUploads += 1;
      }
      if (failedUploads > 0) setMediaWarning(t("mediaUploadPartialFailure", { count: failedUploads }));

      const submitRes = await fetch(`/api/reviews/${reviewId}/submit`, { method: "POST" });
      if (!submitRes.ok) {
        setError(t("submitError"));
        setState("error");
        return;
      }

      setState("success");
      setRating(0);
      setTitle("");
      setBody("");
      for (const m of media) URL.revokeObjectURL(m.previewUrl);
      setMedia([]);
      onSubmitted?.();
      router.refresh();
    } catch {
      setError(t("submitError"));
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div role="status" className="rounded-xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm text-primary">
        {t("submitSuccess")}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="nz-glass space-y-4 rounded-2xl p-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-muted">{t("rating")}</label>
        <div className="flex gap-1" role="radiogroup" aria-label={t("rating")}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star}`}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="p-0.5"
            >
              <Star className={`h-6 w-6 ${(hoverRating || rating) >= star ? "fill-amber-400 text-amber-400" : "text-ink-soft"}`} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="review-title" className="mb-1.5 block text-sm font-medium text-ink-muted">
          {t("reviewTitle")}
        </label>
        <input id="review-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="nz-glass-input w-full rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label htmlFor="review-body" className="mb-1.5 block text-sm font-medium text-ink-muted">
          {t("reviewBody")}
        </label>
        <textarea id="review-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="nz-glass-input w-full rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-muted">{t("addMedia")}</label>
        <div className="flex flex-wrap gap-2">
          {media.map((item, i) => (
            <div key={item.previewUrl} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              {item.mediaType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local blob: object URL, never a remote/optimizable image.
                <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Film className="h-6 w-6 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeMedia(i)}
                aria-label={t("removeMedia")}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-opacity group-hover:opacity-100 sm:opacity-0"
              >
                <X className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-ink-soft transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span className="text-[10px]">{t("addMediaShort")}</span>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFilesSelected} className="hidden" />
      </div>

      {mediaWarning && <p className="text-xs text-amber-600 dark:text-amber-400">{mediaWarning}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
