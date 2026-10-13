"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Send, Star } from "lucide-react";
import { useTranslations } from "next-intl";

const STARS = [1, 2, 3, 4, 5];

/**
 * Real, product-required capability: lets a customer rate a store 1-5
 * stars (POST /api/stores/{slug}/rating, upsert) and shows the
 * store's real aggregate. Deliberately NOT a review list with
 * comments -- confirmed directly against the backend
 * (`apps.stores.infrastructure.models.StoreRating`'s own docstring:
 * "no review text, no media, no moderation" -- a bare 1-5 integer per
 * customer, nothing else exists to render). A star-by-star
 * distribution bar chart is equally not rendered here for the same
 * reason `ReviewsSection` (product reviews) omits one: no endpoint
 * returns per-star counts for a store, and there is nothing else to
 * derive one from honestly.
 *
 * This card owns the whole "Store Rating" section end to end --
 * aggregate summary, the interactive picker when the visitor can
 * rate, and the contextual "log in to rate" / "can't rate your own
 * store" messaging -- so none of that ever has to live awkwardly
 * beside the store's hero title, where it previously did.
 */
export default function StoreRatingWidget({
  slug,
  initialAverage,
  initialCount,
}: {
  slug: string;
  initialAverage: number | null;
  initialCount: number;
}) {
  const t = useTranslations("stores");
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [canRate, setCanRate] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<"idle" | "saved" | "error" | "own-store">("idle");
  const [comment, setComment] = useState("");
  const [savedComment, setSavedComment] = useState("");
  const [commentState, setCommentState] = useState<"idle" | "saving" | "sent" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stores/${encodeURIComponent(slug)}/rating`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return; // 401 (guest) or other -- just fall back to read-only display.
        const body = await res.json();
        if (body?.success) {
          setMyRating(body.data.rating);
          setComment(body.data.comment ?? "");
          setSavedComment(body.data.comment ?? "");
          setCanRate(true);
        }
      })
      .catch(() => {
        // Read-only display is a perfectly fine fallback -- never blocks the page.
      })
      .finally(() => {
        if (!cancelled) setCheckedAuth(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function submitRating(value: number) {
    if (saving) return;
    setSaving(true);
    setFeedback("idle");
    const previousMine = myRating;
    setMyRating(value); // optimistic
    try {
      const res = await fetch(`/api/stores/${encodeURIComponent(slug)}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setMyRating(previousMine);
        setFeedback(body?.error?.code === "CANNOT_RATE_OWN_STORE" ? "own-store" : "error");
        return;
      }
      setAverage(body.data.rating_average);
      setCount(body.data.rating_count);
      setFeedback("saved");
    } catch {
      setMyRating(previousMine);
      setFeedback("error");
    } finally {
      setSaving(false);
    }
  }

  // Private review: sent with the current rating; only the store network's management reads it.
  async function submitComment() {
    if (!myRating || commentState === "saving") return;
    setCommentState("saving");
    try {
      const res = await fetch(`/api/stores/${encodeURIComponent(slug)}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: myRating, comment: comment.trim() }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setCommentState("error");
        return;
      }
      setSavedComment(body.data.comment ?? "");
      setCommentState("sent");
    } catch {
      setCommentState("error");
    }
  }

  const displayValue = hovered ?? myRating ?? 0;

  return (
    <div className="nz-glass rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-ink-muted">{t("storeRating")}</h2>

      {/* Aggregate summary -- centered, matches ReviewsSection's own real-data-only summary card convention. */}
      <div className="mt-3 text-center">
        {count > 0 && average !== null ? (
          <>
            <p className="text-4xl font-bold text-ink">{average.toFixed(1)}</p>
            <div className="mt-1.5 flex justify-center gap-0.5">
              {STARS.map((value) => (
                <Star key={value} className={`h-4 w-4 ${average >= value - 0.5 ? "fill-amber-400 text-amber-400" : "text-ink-soft"}`} strokeWidth={0} aria-hidden="true" />
              ))}
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">{t("ratingCountLabel", { count })}</p>
          </>
        ) : (
          <p className="py-2 text-sm text-ink-soft">{t("noRatingsYet")}</p>
        )}
      </div>

      <div className="mt-5 border-t border-border pt-5">
        {!checkedAuth ? null : canRate ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t("yourRating")}</p>
            <div role="group" aria-label={t("rateThisStore")} className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
              {STARS.map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={saving}
                  onMouseEnter={() => setHovered(value)}
                  onFocus={() => setHovered(value)}
                  onClick={() => submitRating(value)}
                  aria-label={t("starLabel", { n: value })}
                  className="rounded p-1 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none"
                >
                  <Star className={`h-6 w-6 ${value <= displayValue ? "fill-amber-400 text-amber-400" : "fill-transparent text-ink-soft"}`} strokeWidth={1.5} />
                </button>
              ))}
            </div>
            {feedback === "saved" && (
              <span role="status" className="text-xs font-medium text-primary">
                {t("thanksForRating")}
              </span>
            )}
            {feedback === "error" && (
              <span role="alert" className="text-xs text-red-600 dark:text-red-400">
                {t("ratingSaveError")}
              </span>
            )}
            {feedback === "own-store" && <span className="text-xs text-ink-soft">{t("cannotRateOwnStore")}</span>}

            {myRating && feedback !== "own-store" && (
              <div className="mt-4 w-full text-left">
                <label htmlFor="store-review" className="mb-1.5 block text-xs font-semibold text-ink">
                  {t("reviewLabel")}
                </label>
                <textarea
                  id="store-review"
                  rows={4}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    setCommentState("idle");
                  }}
                  placeholder={t("reviewPlaceholder")}
                  className="nz-glass-input w-full resize-none rounded-xl px-3 py-2.5 text-base leading-relaxed sm:text-sm"
                />
                <div className="mt-1.5 flex items-start justify-between gap-3">
                  <p className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-soft">
                    <Lock className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
                    {t("reviewPrivacy")}
                  </p>
                  <span className="shrink-0 text-[11px] tabular-nums text-ink-soft">{comment.length}/1000</span>
                </div>
                <button
                  type="button"
                  onClick={submitComment}
                  disabled={commentState === "saving" || comment.trim() === savedComment.trim()}
                  className="nz-cta mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
                >
                  <Send className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  {savedComment ? t("reviewUpdate") : t("reviewSend")}
                </button>
                {commentState === "sent" && (
                  <p role="status" className="mt-2 text-center text-xs font-medium text-primary">
                    {t("reviewThanks")}
                  </p>
                )}
                {commentState === "error" && (
                  <p role="alert" className="mt-2 text-center text-xs text-red-600 dark:text-red-400">
                    {t("ratingSaveError")}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-ink-muted">
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t("loginToRate")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
