"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Banknote, Coins, PhoneCall, Star, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductCard } from "@/lib/api";
import { formatWeight } from "@/lib/format-weight";
import { cacheVariantDisplays } from "@/lib/product-display-cache";
import AddToCartButton from "@/components/AddToCartButton";
import AddToCartForm from "@/components/AddToCartForm";
import FlavourSwitcher from "@/components/FlavourSwitcher";
import ProductGallery from "@/components/ProductGallery";
import ShareButton from "@/components/ShareButton";
import CompareButton from "@/components/compare/CompareButton";
import StockStatus from "@/components/StockStatus";
import StoreAvailability from "@/components/StoreAvailability";
import WishlistButton from "@/components/WishlistButton";
import PriceTag, { formatPrice } from "@/components/PriceTag";
import ProductCoinReward from "@/components/loyalty/ProductCoinReward";

type Variant = NonNullable<ProductCard["variants"]>[number];


interface Props {
  product: ProductCard;
  categoryName: string | null;
  brandName: string | null;
  isWishlisted: boolean;
  /** Rendered under the gallery on desktop (after the info on phones) -- e.g. the trust badges. */
  extras?: ReactNode;
}

/**
 * The reactive core of the Product Detail page -- one Product Family
 * (`product`) with real, separately-priced/stocked/photographed
 * purchasable configurations (`product.variants`, Flavor x Size).
 * Selecting a different Flavor/Size resolves the real matching
 * variant (never a fabricated one -- VariantSelector already only
 * offers combinations that exist) and updates gallery/price/stock/SKU
 * together, atomically, from that one real object -- never a mix of
 * one variant's photo with another's price. The URL's `?variant=`
 * query param is kept in sync via the raw History API (not
 * next/navigation's router) specifically so this never triggers a
 * server round-trip/refetch -- the data for every sibling variant is
 * already here from the one initial page load.
 */
export default function ProductPurchaseExperience({ product, categoryName, brandName, isWishlisted, extras }: Props) {
  const t = useTranslations("product");
  const tReviews = useTranslations("reviews");
  const searchParams = useSearchParams();

  const purchasableVariants = useMemo(() => (product.variants ?? []).filter((v) => v.status === "active"), [product.variants]);

  const [variantId, setVariantId] = useState<string>(() => {
    const fromUrl = searchParams.get("variant");
    if (fromUrl && purchasableVariants.some((v) => v.id === fromUrl)) return fromUrl;
    const initial = purchasableVariants.find((v) => v.is_default) ?? purchasableVariants[0];
    return initial?.id ?? "";
  });

  const selected: Variant | undefined = purchasableVariants.find((v) => v.id === variantId);

  // Real, closed backend gap (see product-display-cache.ts): remembers
  // every real, purchasable variant's own name/image/attribute label
  // here -- the only place this full data ever exists -- so Cart/
  // Checkout/Order screens can later show a real photo instead of a
  // bare variant id, without inventing anything for a variant this
  // shopper never actually viewed.
  useEffect(() => {
    if (purchasableVariants.length === 0) return;
    const productImage = product.gallery?.[0] ?? product.primary_image_path ?? null;
    cacheVariantDisplays(
      purchasableVariants.map((v) => ({
        variantId: v.id,
        productSlug: product.slug,
        productName: product.name,
        brandName,
        image: v.gallery[0] ?? productImage,
        variantLabel: formatWeight(v.weight_value, v.weight_unit),
        displayPrice: v.price ?? product.price ?? null,
        displayCurrency: v.currency ?? product.currency ?? null,
        cachedAt: Date.now(),
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasableVariants, product.slug, product.name, product.primary_image_path, brandName]);

  // Keep the URL shareable/bookmarkable without ever re-fetching the
  // page -- every variant's data is already in `product`.
  useEffect(() => {
    if (!variantId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("variant") === variantId) return;
    url.searchParams.set("variant", variantId);
    window.history.replaceState(null, "", url.toString());
  }, [variantId]);

  const familyGallery = product.gallery && product.gallery.length > 0 ? product.gallery : product.primary_image_path ? [product.primary_image_path] : [];
  const gallery = selected && selected.gallery.length > 0 ? selected.gallery : familyGallery;
  // The selected variant's own real `video_url` (a genuine, existing
  // field -- see ProductCard's own type) appended last, after every
  // photo, so the primary packshot always stays the first thing shown.
  const galleryMedia = gallery.map((url) => ({ url, isVideo: false }));
  if (selected?.video_url) galleryMedia.push({ url: selected.video_url, isVideo: true });

  const price = selected?.price ?? product.price;
  const currency = selected?.currency ?? product.currency;
  const formattedPrice = formatPrice(price, currency);
  // The selected variant's own markdown when it has a price; the product-level one otherwise (same fallback as `price`).
  const compareAt = selected?.price ? selected.compare_at_price : product.compare_at_price;
  const discountPercent = selected?.price ? selected.discount_percent : product.discount_percent;

  // Reference layout's "250g / 50 servings / 5g" stat row -- the same
  // real `specifications` data the Composition tab shows in full,
  // just the first 3 entries highlighted as a compact stat strip here.
  // Never a second, invented data source.
  const statFacts = (product.specifications ?? []).slice(0, 3);

  const buyBoxRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  useEffect(() => {
    const el = buyBoxRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setShowStickyBar(!entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // "4 sizes · 6 flavors" -- sizeCount from this product's own distinct
  // variant weights; flavorCount from the real Flavour switcher options
  // (a Product-level tag now, not a variant dimension -- see
  // FlavourSwitcher.tsx). Only shown when there's genuinely more than
  // one option to choose from.
  const sizeCount = useMemo(() => new Set(purchasableVariants.filter((v) => v.weight_value !== null).map((v) => `${v.weight_value}${v.weight_unit}`)).size, [purchasableVariants]);
  const flavorCount = product.flavours?.length ?? 0;

  return (
    <>
      {/* Desktop: gallery (top-left) and its companions (bottom-left) beside the info column that spans both rows --
          the two columns stay balanced, no empty space under the photo. Phones: gallery → info → companions. */}
      <div className="mx-auto w-full min-w-0 max-w-[460px] lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1 lg:max-w-none lg:self-start">
        <ProductGallery media={galleryMedia} alt={product.name} badge={discountPercent ? `−${discountPercent}%` : null} />
        {/* Desktop: the trust badges ride along under the photo (the whole column stays pinned while the info scrolls). */}
        {extras && <div className="mt-4 hidden lg:block">{extras}</div>}
      </div>

      <div className="flex min-w-0 flex-col lg:col-start-2 lg:row-start-1">
        {categoryName && (
          <Link href={`/products?category=${product.category_id}`} className="mb-3 w-fit rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary transition-colors hover:brightness-95">
            {categoryName}
          </Link>
        )}

        {/* Identity block: brand -> name -> rating, in one visual group so the eye reads it as a single unit rather than three unrelated lines. */}
        <div>
          {brandName && <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{brandName}</p>}
          <h1 className="mt-0.5 text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">{product.name}</h1>

          {product.rating_count > 0 && product.rating_average !== null ? (
            <a href="#reviewsTab" className="mt-2 flex w-fit items-center gap-1.5 transition-opacity hover:opacity-80">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-4 w-4 ${Math.round(product.rating_average!) >= star ? "fill-amber-400 text-amber-400" : "text-ink-soft"}`} strokeWidth={0} />
                ))}
              </div>
              <span className="text-sm font-semibold text-ink">{product.rating_average.toFixed(1)}</span>
              <span className="text-sm text-ink-soft underline-offset-2 hover:underline">({tReviews("ratingCount", { count: product.rating_count })})</span>
            </a>
          ) : (
            <a href="#reviewsTab" className="mt-2 w-fit text-sm text-ink-soft hover:text-primary hover:underline">
              {tReviews("noReviews")}
            </a>
          )}

          {product.description && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{product.description}</p>}
        </div>

        {(sizeCount > 1 || flavorCount > 1) && (
          <p className="mt-2 text-sm text-ink-soft">
            {[sizeCount > 1 ? t("sizesCount", { count: sizeCount }) : null, flavorCount > 1 ? t("flavorsCount", { count: flavorCount }) : null].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Buy box: price, stock, variants, quantity, CTAs and wishlist/share all live in one cohesive card -- the single decision surface a shopper needs, not several disconnected blocks. */}
        <div ref={buyBoxRef} className="nz-glass-strong mt-5 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            {formattedPrice ? (
              <PriceTag price={price} compareAt={compareAt} discountPercent={discountPercent} currency={currency} size="xl" showSavings />
            ) : (
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-soft">
                  <PhoneCall className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-base font-semibold text-ink">{t("priceUnavailableTitle")}</p>
                  <p className="text-sm text-ink-soft">{t("priceUnavailableHint")}</p>
                </div>
              </div>
            )}
            {selected && <StockStatus status={selected.stock_status} quantity={selected.stock_quantity} className="shrink-0 pt-1" />}
          </div>
          {selected && (
            <p className="mt-1 text-xs text-ink-soft">
              {t("skuLabel")}: {selected.sku}
              {selected.package && ` · ${selected.package.name}`}
            </p>
          )}

          {product.flavours && product.flavours.length > 0 && (
            <div className="mt-4">
              <FlavourSwitcher flavours={product.flavours} />
            </div>
          )}

          <AddToCartForm variants={purchasableVariants} selectedId={variantId} onSelectVariant={setVariantId} fallbackPrice={product.price} fallbackCurrency={product.currency} />

          {/* Delivery, payment and rewards at the point of decision -- facts true for every order on this storefront. */}
          <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/70 bg-surface/40 px-3 text-xs [&>li]:py-2.5">
            <BuyFact icon={Truck} title={t("deliveryTitle")} text={t("deliveryText")} />
            <BuyFact icon={Banknote} title={t("paymentTitle")} text={t("paymentText")} />
            <ProductCoinReward price={price} currency={currency} fallback={<BuyFact icon={Coins} title="NutriZone Coins" text={t("coinsEarn")} href="/loyalty" />} />
          </ul>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            <WishlistButton productId={product.id} initialWishlisted={isWishlisted} className="!h-10 !w-10" />
            <ShareButton title={product.name} />
            <CompareButton slug={product.slug} />
          </div>
        </div>


        {/* Which stores (branches) have the selected variant right now, and how many units each. */}
        {selected && <StoreAvailability stores={selected.store_availability} />}

        {/* Reference layout's compact stat strip -- e.g. "250 g / 50 servings / 5 g" -- real specification entries, not a fabricated serving size. */}
        {statFacts.length > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {statFacts.map((spec) => (
              <div key={spec.key} className="nz-glass rounded-xl px-2 py-3 text-center">
                <p className="text-base font-bold text-ink sm:text-lg">{spec.value}</p>
                <p className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-ink-soft" title={spec.key}>
                  {spec.key}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {extras && <div className="min-w-0 lg:hidden">{extras}</div>}

      {/* Mobile sticky buy bar -- appears once the real buy box scrolls out of view, so the primary CTA never becomes hard to reach on a long product page. Adds the currently *selected* variant (Flavor/Size stay in sync with the main panel above) via the same real AddToCartButton every product card already uses -- never a second, divergent add-to-cart implementation. */}
      {showStickyBar && selected && (
        <div
          className="animate-nz-fade-in fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur-md sm:hidden"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            {formattedPrice && <PriceTag price={price} compareAt={compareAt} discountPercent={discountPercent} currency={currency} size="sm" showBadge={false} className="shrink-0" />}
            <AddToCartButton variantId={selected.id} className="!w-full flex-1 !py-3" />
          </div>
        </div>
      )}
    </>
  );
}

function BuyFact({ icon: Icon, title, text, href }: { icon: typeof Truck; title: string; text: string; href?: string }) {
  const body = (
    <>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block leading-snug text-ink-muted">{text}</span>
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="flex items-start gap-2 rounded-lg transition-colors hover:text-primary">
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-2">{body}</div>
      )}
    </li>
  );
}
