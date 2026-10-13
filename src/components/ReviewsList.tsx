"use client";

import { useLocale, useTranslations } from "next-intl";
import { Pencil, Star } from "lucide-react";
import type { PublicReviewCard } from "@/lib/reviews-api";
import { Badge } from "@/components/ui";
// Same output on server and browser (Intl's "uz" data differs between Node and Chrome, which broke hydration).
import { formatDate } from "@/lib/dates";

/**
 * Pure presentational list -- `ReviewsSection` owns fetching/sorting/
 * filtering/pagination and passes the already-derived array in here.
 * Client Component (not the Server Component this originally was) so
 * it can live inside that interactive parent without a second,
 * duplicated card-rendering implementation for "loaded via Load More"
 * items -- next-intl's client hooks are the same i18n system, just
 * the client-side half of it.
 *
 * `myReviewIds` (real, product-required capability): the public review
 * payload itself carries no `customer_id` (privacy-safe by design --
 * see the backend selector's own docstring), so "is this my review"
 * is resolved separately (via the real, existing customer-scoped
 * review list) and passed in here purely to decide whether to show
 * the Edit button -- never used to display anyone else's identity.
 */
export default function ReviewsList({
  reviews, emptyMessage, myReviewIds, onEditRequest,
}: {
  reviews: PublicReviewCard[];
  emptyMessage?: string;
  myReviewIds?: Set<string>;
  onEditRequest?: (reviewId: string) => void;
}) {
  const t = useTranslations("reviews");
  const locale = useLocale();

  if (reviews.length === 0) {
    return <p className="py-6 text-sm text-ink-muted">{emptyMessage ?? t("noReviews")}</p>;
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id} className="nz-glass rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex gap-0.5" aria-label={`${review.rating} / 5`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-4 w-4 ${review.rating >= star ? "fill-amber-400 text-amber-400" : "text-ink-soft"}`} strokeWidth={1.5} />
                ))}
              </div>
              <span className="text-sm font-medium text-ink">{review.author_name}</span>
              {review.verified_purchase && <Badge tone="success">{t("verifiedPurchase")}</Badge>}
              {myReviewIds?.has(review.id) && <Badge tone="neutral">{t("yourReview")}</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-soft">{formatDate(review.created_at, locale, "long")}</span>
              {myReviewIds?.has(review.id) && onEditRequest && (
                <button
                  type="button"
                  onClick={() => onEditRequest(review.id)}
                  aria-label={t("editReviewTitle")}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-soft transition-colors hover:text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  {t("edit")}
                </button>
              )}
            </div>
          </div>
          {review.title && <h3 className="mt-2 text-sm font-semibold text-ink">{review.title}</h3>}
          {review.body && <p className="mt-1 text-sm text-ink-muted">{review.body}</p>}
          {review.media.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {review.media.map((m) => (
                <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="block h-16 w-16 overflow-hidden rounded-lg bg-surface-2">
                  {m.media_type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- review media host isn't statically declarable, matching MediaImage's own established rationale.
                    <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <video src={m.url} className="h-full w-full object-cover" muted preload="metadata" />
                  )}
                </a>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
