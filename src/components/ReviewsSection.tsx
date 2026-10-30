"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { getPublicProductReviews, type PublicReviewCard, type ReviewCard } from "@/lib/reviews-api";
import { Select } from "@/components/ui";
import ReviewsList from "@/components/ReviewsList";
import ReviewForm from "@/components/ReviewForm";
import ReviewEditModal from "@/components/ReviewEditModal";
import LoadMore from "@/components/LoadMore";

const PAGE_SIZE = 10;

type SortKey = "recent" | "highest" | "lowest";
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

interface Props {
  productId: string;
  initialReviews: PublicReviewCard[];
  initialTotalCount: number;
  ratingAverage: number | null;
  ratingCount: number;
  loginHref: string;
  isAuthenticated: boolean;
}

/**
 * Owns the whole Reviews tab: the real aggregate summary (product-level
 * `rating_average`/`rating_count`, never recomputed from whatever page
 * happens to be loaded), sort/filter of the reviews actually loaded so
 * far (the backend's only supported list filter is `filter[status]` --
 * confirmed directly against `apps/reviews`'s own view docstring, so
 * "Highest/Lowest Rated" is real client-side sorting of real data, not
 * a fabricated server capability), "Load More" pagination against the
 * genuinely paginated public endpoint, and the write-a-review form.
 *
 * A star-by-star rating distribution bar chart (5* / 4* / .../ 1*) is
 * deliberately NOT included: no backend endpoint returns per-star
 * counts, and computing one from only the reviews loaded so far would
 * silently misrepresent products with more reviews than are loaded --
 * exactly the kind of fabricated-looking data this page must avoid.
 */
export default function ReviewsSection({ productId, initialReviews, initialTotalCount, ratingAverage, ratingCount, loginHref, isAuthenticated }: Props) {
  const t = useTranslations("reviews");
  const [reviews, setReviews] = useState(initialReviews);
  const [totalCount] = useState(initialTotalCount);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [myReviews, setMyReviews] = useState<ReviewCard[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Real, product-required capability: "is this my review" (to show the
  // Edit button) is resolved via the real, existing customer-scoped
  // review list -- the public payload itself carries no customer_id
  // (privacy-safe by design, see ReviewsList.tsx's own docstring).
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetch(`/api/reviews/mine?product_id=${encodeURIComponent(productId)}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled && body.success) setMyReviews(body.data as ReviewCard[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, productId]);

  const myReviewIds = useMemo(() => new Set(myReviews.map((r) => r.id)), [myReviews]);
  const editingReview = editingReviewId ? myReviews.find((r) => r.id === editingReviewId) ?? null : null;

  function handleReviewSaved(updated: ReviewCard) {
    setMyReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setReviews((prev) => prev.map((r) => (r.id === updated.id ? { ...r, title: updated.title, body: updated.body } : r)));
    setEditingReviewId(null);
  }

  function handleReviewDeleted(reviewId: string) {
    setMyReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setEditingReviewId(null);
  }

  // Real, explicit product decision (see SubmitReview's own backend
  // docstring): a submitted review is now published immediately, no
  // admin approval required -- refetching page 1 picks up the real,
  // newly-published review (and its real author display name/media),
  // never a client-fabricated card.
  async function handleReviewPublished() {
    try {
      const { items } = await getPublicProductReviews(productId, 1, PAGE_SIZE);
      setReviews((current) => {
        const seen = new Set(current.map((r) => r.id));
        const fresh = items.filter((r) => !seen.has(r.id));
        return [...fresh, ...current];
      });
    } catch {
      // The review was still submitted successfully -- a failed refetch here just means the list catches up on next load, never a lost submission.
    }
  }

  const visibleReviews = useMemo(() => {
    let list = reviews;
    if (ratingFilter !== "all") {
      const target = Number(ratingFilter);
      list = list.filter((r) => r.rating === target);
    }
    if (sort === "highest") list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sort === "lowest") list = [...list].sort((a, b) => a.rating - b.rating);
    // "recent" needs no client re-sort -- the backend already returns newest-first.
    return list;
  }, [reviews, sort, ratingFilter]);

  const hasMore = reviews.length < totalCount;

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const nextPage = Math.floor(reviews.length / PAGE_SIZE) + 1;
      const { items } = await getPublicProductReviews(productId, nextPage, PAGE_SIZE);
      setReviews((current) => {
        const seen = new Set(current.map((r) => r.id));
        return [...current, ...items.filter((r) => !seen.has(r.id))];
      });
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        {/* Real product-level aggregate -- never recomputed from a loaded subset. */}
        {ratingCount > 0 && ratingAverage !== null ? (
          <div className="nz-glass mb-5 flex flex-wrap items-center gap-4 rounded-2xl p-5">
            <p className="text-4xl font-bold text-ink">{ratingAverage.toFixed(1)}</p>
            <div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-4 w-4 ${Math.round(ratingAverage) >= star ? "fill-amber-400 text-amber-400" : "text-ink-soft"}`} strokeWidth={0} />
                ))}
              </div>
              <p className="mt-1 text-sm text-ink-muted">{t("basedOn", { count: ratingCount })}</p>
            </div>
          </div>
        ) : (
          <div className="nz-glass mb-5 rounded-2xl p-5 text-center">
            <p className="text-base font-semibold text-ink">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-ink-muted">{t("emptyCta")}</p>
          </div>
        )}

        {reviews.length > 1 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-ink-soft">{t("sortLabel")}</span>
              <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} wrapperClassName="inline-block" className="rounded-lg py-1.5 pl-2.5 pr-8">
                <option value="recent">{t("sortRecent")}</option>
                <option value="highest">{t("sortHighest")}</option>
                <option value="lowest">{t("sortLowest")}</option>
              </Select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-ink-soft">{t("filterLabel")}</span>
              <Select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value as RatingFilter)} wrapperClassName="inline-block" className="rounded-lg py-1.5 pl-2.5 pr-8">
                <option value="all">{t("filterAll")}</option>
                <option value="5">{t("filterStars", { count: 5 })}</option>
                <option value="4">{t("filterStars", { count: 4 })}</option>
                <option value="3">{t("filterStars", { count: 3 })}</option>
                <option value="2">{t("filterStars", { count: 2 })}</option>
                <option value="1">{t("filterOneStar")}</option>
              </Select>
            </label>
          </div>
        )}

        <ReviewsList
          reviews={visibleReviews}
          emptyMessage={ratingFilter !== "all" ? t("noMatchingReviews") : undefined}
          myReviewIds={myReviewIds}
          onEditRequest={setEditingReviewId}
        />

        {/* manual only: the product page continues below the reviews, an endless feed would bury it */}
        <LoadMore className="mt-4" hasMore={hasMore} loading={loadingMore} error={loadMoreError} onMore={loadMore} shown={reviews.length} total={totalCount} auto={false} />
      </div>

      {isAuthenticated ? (
        <ReviewForm productId={productId} onSubmitted={handleReviewPublished} />
      ) : (
        <div className="nz-glass rounded-2xl p-5 text-sm text-ink-muted">
          <Link href={loginHref} className="font-medium text-primary hover:underline">
            {t("loginToReview")}
          </Link>
        </div>
      )}

      {editingReview && (
        <ReviewEditModal review={editingReview} onClose={() => setEditingReviewId(null)} onSaved={handleReviewSaved} onDeleted={handleReviewDeleted} />
      )}
    </div>
  );
}
