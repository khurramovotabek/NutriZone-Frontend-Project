/**
 * Server-only calls to the real NutriZone Reviews API.
 *
 * HISTORICAL NOTE, confirmed directly from the backend permission
 * source (apps/reviews/interfaces/api/v1/permissions.py): despite
 * `ViewOwnReviews`'s own docstring describing product-review listing
 * as "public/anonymous-readable", its actual `permission_code`
 * ("reviews.review.view_own") is checked via the same
 * `BaseReviewPermission.has_permission()` every other Reviews
 * permission uses, which requires `request.user.is_authenticated`.
 * This gap is now closed: `GET /reviews/products/{id}/public` (backing
 * `getPublicProductReviews` below) is the real, `AllowAny`,
 * PUBLISHED-only public read path -- use it for anything a logged-out
 * visitor should see. `getProductReviews` (authenticated) remains for
 * any call site that specifically needs an authenticated view.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface ReviewCard {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  verified_purchase: boolean;
}

export interface ReviewDetail extends ReviewCard {
  body: string;
}

export interface ReviewMediaItem {
  id: string;
  media_type: string;
  url: string;
}

export interface BackendErrorBody {
  success: false;
  error: { code: string; message: string; category: string; details: Record<string, unknown> };
}

export class ReviewsApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ReviewsApiError";
  }
}

async function reviewsFetch<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(init.headers as Record<string, string>) };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new ReviewsApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as T;
}

/** A published review as returned by the real public read endpoint -- privacy-safe (first name + last initial only, never a full name/contact detail; see the backend selector's own docstring). */
export interface PublicReviewCard {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  verified_purchase: boolean;
  author_name: string;
  created_at: string;
  media: { id: string; media_type: string; url: string }[];
}

/**
 * The genuinely public review read path -- no access token needed,
 * safe to call for any visitor (logged in or not). Callable from
 * Server or Client Components, matching `searchProducts()`'s own
 * client-safe convention (only ever reads NEXT_PUBLIC_API_BASE_URL).
 */
export async function getPublicProductReviews(productId: string, page = 1, pageSize = 10): Promise<{ items: PublicReviewCard[]; totalCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/reviews/products/${encodeURIComponent(productId)}/public?page=${page}&page_size=${pageSize}`, { next: { revalidate: 60 } });
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new ReviewsApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return { items: body.data as PublicReviewCard[], totalCount: body.pagination?.total_count ?? 0 };
}

export async function getProductReviews(accessToken: string, productId: string, page = 1): Promise<{ items: ReviewCard[]; totalCount: number }> {
  // Only "published" reviews are meant to be publicly visible -- the
  // backend selector returns every status (draft/pending/rejected/
  // hidden included) if no status filter is supplied.
  const data = await reviewsFetchWithPagination<ReviewCard[]>(`/api/v1/reviews/products/${productId}?page=${page}&filter[status]=published`, accessToken);
  return data;
}

async function reviewsFetchWithPagination<T>(path: string, accessToken: string): Promise<{ items: T; totalCount: number }> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };
  const response = await fetch(`${API_BASE_URL}${path}`, { headers, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new ReviewsApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return { items: body.data as T, totalCount: body.pagination?.total_count ?? 0 };
}

export async function createReview(accessToken: string, productId: string, rating: number, body: string, title?: string): Promise<ReviewDetail> {
  return reviewsFetch<ReviewDetail>("/api/v1/reviews/", accessToken, {
    method: "POST",
    body: JSON.stringify({ product_id: productId, rating, body, ...(title ? { title } : {}) }),
  });
}

/**
 * Real, closed bug: this previously sent `{"media_type": ..., "url":
 * ...}` as JSON, but the real backend endpoint (`AttachReviewMediaView`
 * / `AttachReviewMediaSerializer`) only ever accepted real multipart
 * `multipart/form-data` with a `file_upload` FileField -- there is no
 * `url` field on that serializer at all, confirmed directly against
 * the source. Every prior call to this function silently 422'd and
 * was swallowed as "non-critical" by ReviewForm.tsx, meaning photo
 * attachment on a review has never actually worked. `formData` is
 * passed straight through -- no Content-Type header is set here
 * deliberately, so `fetch` sets the correct multipart boundary itself.
 */
export async function attachReviewMediaFile(accessToken: string, reviewId: string, formData: FormData): Promise<ReviewDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/reviews/${reviewId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    throw new ReviewsApiError(response.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }
  return body.data as ReviewDetail;
}

export async function submitReview(accessToken: string, reviewId: string): Promise<ReviewDetail> {
  return reviewsFetch<ReviewDetail>(`/api/v1/reviews/${reviewId}/submit`, accessToken, { method: "POST", body: JSON.stringify({}) });
}

export async function getReviewMedia(accessToken: string, reviewId: string): Promise<ReviewMediaItem[]> {
  return reviewsFetch<ReviewMediaItem[]>(`/api/v1/reviews/${reviewId}/media`, accessToken, { method: "GET" });
}

export async function editReview(accessToken: string, reviewId: string, body: string, title?: string): Promise<ReviewDetail> {
  return reviewsFetch<ReviewDetail>(`/api/v1/reviews/${reviewId}/edit`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ body, ...(title !== undefined ? { title } : {}) }),
  });
}

/**
 * Real, existing capability (`WithdrawReviewView`) -- a soft, terminal
 * status change (`ReviewStatus.WITHDRAWN`), never a hard delete,
 * matching this backend's own append-only conventions. A withdrawn
 * review immediately disappears from the public list (the public
 * selector only ever returns PUBLISHED rows) -- this is the real
 * "delete my review" capability, there is no separate hard-delete
 * endpoint and none is invented here.
 */
export async function withdrawReview(accessToken: string, reviewId: string): Promise<ReviewDetail> {
  return reviewsFetch<ReviewDetail>(`/api/v1/reviews/${reviewId}/withdraw`, accessToken, { method: "POST", body: JSON.stringify({}) });
}

function decodeUserId(accessToken: string): string {
  const payload = accessToken.split(".")[1];
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  const json = Buffer.from(padded, "base64").toString("utf-8");
  return JSON.parse(json).user_id;
}

/**
 * Real, existing capability (`CustomerReviewListView`) -- lists every
 * review the authenticated customer has ever written, any status.
 * Used purely to answer "does the current visitor already have a
 * review on THIS product" (filtered client-side by `product_id`, since
 * the real endpoint is customer-scoped only, not product-scoped) --
 * never a second review-listing concept.
 */
export async function getMyReviews(accessToken: string, page = 1): Promise<{ items: ReviewCard[]; totalCount: number }> {
  const userId = decodeUserId(accessToken);
  return reviewsFetchWithPagination<ReviewCard[]>(`/api/v1/reviews/customers/${userId}?page=${page}`, accessToken);
}
