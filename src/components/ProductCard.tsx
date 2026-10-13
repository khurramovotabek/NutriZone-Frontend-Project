"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Package, Sparkles, Star, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductCard as ProductCardData } from "@/lib/api";
import { cacheVariantDisplays } from "@/lib/product-display-cache";
import { Card } from "@/components/ui";
import ProductMediaImage from "@/components/ProductMediaImage";
import WishlistButton from "@/components/WishlistButton";
import AddToCartButton from "@/components/AddToCartButton";
import PriceTag, { formatPrice, isDiscounted } from "@/components/PriceTag";

const NEW_PRODUCT_DAYS = 30;
const TOP_RATED_MIN_AVERAGE = 4.5;
const TOP_RATED_MIN_COUNT = 2;

/** Added to the catalog within the last month. A plain function (not inline in render) so the clock read stays out of the component body. */
function isNewProduct(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < NEW_PRODUCT_DAYS * 86_400_000;
}

/**
 * The single, reusable Product Card system behind every product grid
 * on the site (Home sections, Catalog, Search results, Related
 * Products, Wishlist, Store Products). One component, three visual
 * densities (`variant`) -- never a second, page-specific card design.
 *
 * Renders only fields the real `ProductCard` API type actually carries
 * (confirmed directly against a live `GET /products` response):
 * id/slug/name/brand_id/primary_image_path/price/currency/
 * rating_average/rating_count/default_variant_id. Three fields the
 * reference design calls for are deliberately absent, honestly, not
 * approximated:
 *   (discount / old price are shown: the API now carries
 *   `compare_at_price` + `discount_percent` -- see PriceTag.)
 *   (stock is shown: list-level cards now carry the product's total
 *   `stock_quantity`/`stock_status`, bulk-resolved by the backend --
 *   see `StockLine` below.)
 *   - second image on hover: `gallery` is likewise detail-only.
 * A shopper reaches all three by opening the product's own detail
 * page (Quick View was removed -- the extra modal cost more chrome
 * than it saved a shopper a single tap to the real page).
 */
export default function ProductCard({
  product,
  brandName = null,
  initialWishlisted = false,
  variant = "standard",
  layout = "grid",
  href,
  priority = false,
}: {
  product: ProductCardData;
  /** Resolved separately by the caller via `getBrandNameMap()` -- the card API itself only ever carries `brand_id`. */
  brandName?: string | null;
  initialWishlisted?: boolean;
  variant?: "standard" | "featured" | "compact";
  layout?: "grid" | "list";
  /** Overrides the default `/products/{slug}` target -- the one real case that needs it is Store Products, whose own item shape carries no real slug (see StoreProductSearch's own docstring). */
  href?: string;
  /** Eager-loads the image for above-the-fold cards (first grid row); every other card stays lazy. */
  priority?: boolean;
}) {
  // A Client Component -- deliberately, unlike most of this codebase's
  // page-level components: this card must be renderable from BOTH a
  // Server Component parent (Home, Catalog, Wishlist, Related Products)
  // AND a Client Component parent (StoreProductSearch's own interactive
  // search/filter/sort state) -- React Server Components can only ever
  // be rendered by a Server Component ancestor, never instantiated
  // directly inside a Client Component's own tree. Every interactive
  // piece this card already composes (WishlistButton, AddToCartButton)
  // was already a Client Component regardless.
  const t = useTranslations("product");
  const tReviews = useTranslations("reviews");
  const targetHref = href ?? `/products/${product.slug}`;
  const formattedPrice = formatPrice(product.price, product.currency);
  const hasRating = product.rating_count > 0 && product.rating_average !== null;
  const discounted = isDiscounted(product.price, product.compare_at_price);
  const isNew = isNewProduct(product.created_at);
  const topRated = hasRating && product.rating_average! >= TOP_RATED_MIN_AVERAGE && product.rating_count >= TOP_RATED_MIN_COUNT;
  // At most two corner badges (discount + one more) so they never cover the packshot; "Top rated" outranks "New".

  // Opportunistically remembers this card's real name/image against its
  // default variant id -- the only way Cart/Checkout can later show a
  // real photo instead of a bare id (see product-display-cache.ts).
  useEffect(() => {
    if (!product.default_variant_id) return;
    cacheVariantDisplays([
      {
        variantId: product.default_variant_id,
        productSlug: product.slug,
        productName: product.name,
        brandName,
        image: product.primary_image_path,
        variantLabel: null,
        displayPrice: product.price,
        displayCurrency: product.currency,
        cachedAt: Date.now(),
      },
    ]);
  }, [product.default_variant_id, product.slug, product.name, product.primary_image_path, product.price, product.currency, brandName]);

  // Stock 0 -> sold out. Either signal counts: the bulk status, or an
  // explicit zero count (a tracked product with nothing left).
  const outOfStock = product.stock_status === "out_of_stock" || product.stock_quantity === 0;

  if (layout === "list") {
    return (
      <Link href={targetHref} aria-label={outOfStock ? `${product.name} — ${t("outOfStock")}` : undefined}>
        <Card className={`nz-glass-interactive group relative flex items-center gap-4 overflow-hidden p-3 transition-all duration-200 ease-out hover:-translate-y-0.5 ${outOfStock ? "nz-soldout" : ""}`}>
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white">
            {discounted && product.discount_percent ? (
              <span className="absolute left-1 top-1 z-10 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">{t("discountOff", { percent: product.discount_percent })}</span>
            ) : null}
            <ProductMediaImage
              src={product.primary_image_path}
              size="medium"
              alt={product.name}
              fit="contain"
              sizes="80px"
              className="transition-transform duration-300 ease-out group-hover:scale-[1.04]"
              loading={priority ? "eager" : "lazy"}
              fallbackIcon={<Package className="h-8 w-8 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />}
            />
          </div>
          <div className="min-w-0 flex-1">
            {brandName && <p className="truncate text-xs font-medium uppercase tracking-wide text-ink-soft">{brandName}</p>}
            <p className="line-clamp-1 text-sm font-medium text-ink transition-colors group-hover:text-primary">{product.name}</p>
            <RatingRow hasRating={hasRating} average={product.rating_average} count={product.rating_count} noReviewsLabel={t("noReviewsShort")} reviewsLabel={tReviews("ratingCount", { count: product.rating_count })} size="sm" />
            <StockLine status={product.stock_status} quantity={product.stock_quantity} size="xs" />
            {formattedPrice && <PriceTag price={product.price} compareAt={product.compare_at_price} discountPercent={product.discount_percent} currency={product.currency} size="sm" className="mt-1" />}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <WishlistButton productId={product.id} initialWishlisted={initialWishlisted} />
            <AddToCartButton variantId={product.default_variant_id ?? ""} outOfStock={outOfStock} unavailable={!product.default_variant_id} />
          </div>
        </Card>
      </Link>
    );
  }

  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";

  return (
    <Link href={targetHref} className="block h-full">
      <Card
        className={`nz-glass-interactive group relative flex h-full flex-col overflow-hidden !p-0 transition-all duration-300 ease-out ${isFeatured ? "nz-glass-strong" : ""} ${outOfStock ? "nz-soldout" : ""}`}
      >
        {/* MEDIA -- full-bleed: the photo owns the whole top of the card (no inset padding), on the white ground product packshots are shot on, so it reads as one seamless image rather than a thumbnail floating in a tile. */}
        <div className={`relative overflow-hidden bg-white ${isFeatured ? "aspect-[4/5]" : "aspect-square"}`}>
          <div className="absolute right-2 top-2 z-10">
            <WishlistButton productId={product.id} initialWishlisted={initialWishlisted} />
          </div>
          {(discounted || isNew || topRated) && !outOfStock && (
            <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
              {discounted && product.discount_percent ? (
                <span className={`rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 font-extrabold text-white shadow-[0_6px_16px_-6px_rgba(225,29,72,0.7)] ${isCompact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs"}`}>
                  {t("discountOff", { percent: product.discount_percent })}
                </span>
              ) : null}
              {isNew && !topRated && !isCompact && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                  <Sparkles className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
                  {t("newBadge")}
                </span>
              )}
              {topRated && !isCompact && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                  <TrendingUp className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
                  {t("topRatedBadge")}
                </span>
              )}
            </div>
          )}
          <ProductMediaImage
            src={product.primary_image_path}
            size={isCompact ? "medium" : "large"}
            alt={product.name}
            fit="contain"
            loading={priority ? "eager" : "lazy"}
            sizes={isCompact ? "(max-width: 640px) 45vw, 180px" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"}
            className={`transition-transform duration-500 ease-out ${outOfStock ? "" : "group-hover:scale-[1.05]"}`}
            fallbackIcon={<Package className={isFeatured ? "h-12 w-12 text-ink-soft" : "h-10 w-10 text-ink-soft"} strokeWidth={1.25} aria-hidden="true" />}
          />
          {outOfStock && (
            <span className="nz-soldout-stamp absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] whitespace-nowrap rounded-md px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
              {t("outOfStock")}
            </span>
          )}
        </div>

        {/* CONTENT */}
        <div className={`flex flex-1 flex-col ${isCompact ? "p-2.5" : isFeatured ? "p-4" : "p-3.5"}`}>
          {brandName && !isCompact && <p className="truncate text-xs font-medium uppercase tracking-wide text-ink-soft">{brandName}</p>}
          <p
            className={`mt-0.5 line-clamp-2 font-medium text-ink transition-colors group-hover:text-primary ${isFeatured ? "text-base" : isCompact ? "text-xs" : "text-sm"}`}
          >
            {product.name}
          </p>

          <RatingRow
            hasRating={hasRating}
            average={product.rating_average}
            count={product.rating_count}
            noReviewsLabel={t("noReviewsShort")}
            reviewsLabel={tReviews("ratingCount", { count: product.rating_count })}
            size={isCompact ? "xs" : "sm"}
          />
          <StockLine status={product.stock_status} quantity={product.stock_quantity} size={isCompact ? "xs" : "sm"} />

          <div className="mt-auto pt-2">
            {formattedPrice ? (
              <PriceTag
                price={product.price}
                compareAt={product.compare_at_price}
                discountPercent={product.discount_percent}
                currency={product.currency}
                size={isFeatured ? "md" : isCompact ? "xs" : "sm"}
                showBadge={false}
              />
            ) : (
              !isCompact && <p className="text-xs text-ink-soft">{t("priceUnavailable")}</p>
            )}
            <AddToCartButton
              variantId={product.default_variant_id ?? ""}
              outOfStock={outOfStock}
              unavailable={!product.default_variant_id}
              className={`mt-2 w-full ${isFeatured ? "!py-2.5 !text-sm" : ""}`}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}

/** Total units left across the product's variants -- "95 in stock" / "Only 3 left" / "Out of stock". Renders nothing when the product has no inventory record (not tracked), never a guessed count. Status is carried by the label text as well as the dot's color (WCAG). */
function StockLine({ status, quantity, size }: { status?: "in_stock" | "low_stock" | "out_of_stock" | null; quantity?: number | null; size: "xs" | "sm" }) {
  const t = useTranslations("product");
  if (!status) return null;
  const label = status === "out_of_stock" ? t("outOfStock") : status === "low_stock" ? t("lowStockLeft", { count: quantity ?? 0 }) : t("stockLeft", { count: quantity ?? 0 });
  const tone = status === "out_of_stock" ? "text-red-600 dark:text-red-400" : status === "low_stock" ? "text-amber-700 dark:text-amber-300" : "text-success";
  const dot = status === "out_of_stock" ? "bg-red-500" : status === "low_stock" ? "bg-amber-500" : "bg-success";
  return (
    <p className={`mt-1 inline-flex items-center gap-1.5 font-medium ${tone} ${size === "xs" ? "text-[11px]" : "text-xs"}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {label}
    </p>
  );
}

/** ★ 4.8 (128 reviews) -- one compact star, never five giant ones, per this card's own space budget. Honestly omitted (not "★ 0.0 (0)") when the product genuinely has no reviews yet. */
function RatingRow({
  hasRating,
  average,
  count,
  noReviewsLabel,
  reviewsLabel,
  size,
}: {
  hasRating: boolean;
  average: number | null;
  count: number;
  noReviewsLabel: string;
  reviewsLabel: string;
  size: "xs" | "sm";
}) {
  const textSize = size === "xs" ? "text-[11px]" : "text-xs";
  if (!hasRating) return <p className={`mt-1 ${textSize} text-ink-soft`}>{noReviewsLabel}</p>;
  return (
    <div className="mt-1 flex items-center gap-1">
      <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" strokeWidth={0} aria-hidden="true" />
      <span className={`font-medium text-ink-muted ${textSize}`}>{average!.toFixed(1)}</span>
      <span className={`text-ink-soft ${textSize}`}>({count})</span>
      <span className="sr-only">{reviewsLabel}</span>
    </div>
  );
}
