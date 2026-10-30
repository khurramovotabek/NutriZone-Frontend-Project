import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { ApiError, getBrands, getCategories, getProductBySlug, getProductRecommendations } from "@/lib/api";
import { getPublicProductReviews } from "@/lib/reviews-api";
import { getWishlist } from "@/lib/wishlist-api";
import { getAccessToken } from "@/lib/session";
import CompositionTable from "@/components/CompositionTable";
import ProductPurchaseExperience from "@/components/ProductPurchaseExperience";
import ProductTabs from "@/components/ProductTabs";
import RelatedProducts from "@/components/RelatedProducts";
import ReviewsSection from "@/components/ReviewsSection";
import SupplementFactsSection from "@/components/SupplementFactsSection";
import TrustBar from "@/components/TrustBar";
import ProductJsonLd from "@/components/ProductJsonLd";
import { clip, pageMetadata, productPaths } from "@/lib/seo";
import { categoryPath } from "@/lib/entity-paths";
import { ErrorState, Skeleton } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const locale = await getLocale();
    const [{ data: product }, t] = await Promise.all([getProductBySlug(slug, locale), getTranslations("seo")]);
    if (product.moved_to) return { robots: { index: false, follow: true } };
    const brandName = product.brand_id ? await getBrands(locale).then((r) => r.data.find((b) => b.id === product.brand_id)?.name ?? null).catch(() => null) : null;
    const amount = Number(product.price);
    const price = product.price && Number.isFinite(amount) && amount > 0
      ? `${Math.round(amount).toLocaleString("ru-RU").replace(/\s/g, " ")} ${product.currency && product.currency !== "UZS" ? product.currency : locale === "ru" ? "сум" : "so'm"}`
      : null;
    const brandPart = brandName && !product.name.toLowerCase().includes(brandName.toLowerCase()) ? ` (${brandName})` : "";
    // A written description wins; otherwise a factual one (name, brand, price) instead of an empty snippet.
    const description = product.description?.trim()
      ? clip(product.description, 160)
      : price
        ? t("productDescription", { name: product.name, brandPart, price })
        : t("productDescriptionNoPrice", { name: product.name, brandPart });
    return pageMetadata({
      path: productPaths(product),
      title: t("productTitle", { name: product.name }),
      description,
      image: product.primary_image_path,
      imageAlt: product.name,
    });
  } catch {
    return { title: (await getTranslations("meta"))("product") };
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("product");
  const tCatalog = await getTranslations("catalog");

  let product;
  try {
    const result = await getProductBySlug(slug, await getLocale());
    product = result.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    return <ErrorState message={t("loadError")} />;
  }

  // Grouped into a product family (Dashboard → Guruhlash): the old address moves for good to the family page,
  // with the variant this product used to be pre-selected.
  if (product.moved_to) {
    permanentRedirect(`/products/${product.moved_to.slug}${product.moved_to.variant_id ? `?variant=${product.moved_to.variant_id}` : ""}`);
  }

  // Real category name resolved from the product's own real category_id
  // -- gracefully omitted (not fabricated) if it can't be resolved.
  let categoryName: string | null = null;
  let categoryHref: string | null = null;
  if (product.category_id) {
    try {
      const { data: categories } = await getCategories(await getLocale());
      const category = categories.find((c) => c.id === product.category_id);
      categoryName = category?.name ?? null;
      categoryHref = category ? categoryPath(category) : null;
    } catch {
      // Breadcrumb/category chip is a bonus, not critical path -- product still renders without it.
    }
  }

  // Real brand name resolved from the product's own brand_id, same
  // established pattern as categoryName above -- the product detail
  // response itself only carries brand_id, never a resolved name.
  let brandName: string | null = null;
  if (product.brand_id) {
    try {
      const { data: brands } = await getBrands();
      brandName = brands.find((b) => b.id === product.brand_id)?.name ?? null;
    } catch {
      // Bonus identity line, never a critical-path dependency.
    }
  }

  const accessToken = await getAccessToken();

  let isWishlisted = false;
  if (accessToken) {
    try {
      const wishlist = await getWishlist(accessToken);
      isWishlisted = wishlist.some((item) => item.id === product.id);
    } catch {
      // A logged-in visitor's wishlist membership is a nice-to-have pre-fill, never a page-breaking dependency.
    }
  }

  let relatedProducts: Awaited<ReturnType<typeof getProductRecommendations>>["data"] = [];
  try {
    relatedProducts = (await getProductRecommendations(slug, await getLocale())).data;
  } catch {
    // "You may also like" is a bonus section -- the product page still renders fully without it.
  }

  let reviews: Awaited<ReturnType<typeof getPublicProductReviews>>["items"] = [];
  let reviewsTotal = 0;
  try {
    const result = await getPublicProductReviews(product.id, 1, 10);
    reviews = result.items;
    reviewsTotal = result.totalCount;
  } catch {
    // Reviews tab shows its own empty/error state below -- never blocks the rest of the page.
  }

  // Xususiyatlar: admin kiritgan qatorlar + mahsulotning tuzilgan ma'lumotlari (brend, hajm, ta'm, porsiya...) --
  // tab hech qachon bo'sh qolmasin; admin qatori bir xil nomdagi avtomatik qatordan ustun.
  const defaultVariant = product.variants?.find((v) => v.is_default) ?? product.variants?.[0];
  const unitLabel = (unit: string) => ({ g: "g", kg: "kg", ml: "ml", l: "l" } as Record<string, string>)[unit] ?? unit;
  const currentFlavours = (product.flavours ?? []).filter((f) => f.is_current).map((f) => f.name);
  const derived: { key: string; value: string | null | undefined }[] = [
    { key: t("specBrand"), value: brandName },
    { key: t("specCategory"), value: categoryName },
    { key: t("specSize"), value: defaultVariant?.weight_value ? `${defaultVariant.weight_value} ${unitLabel(defaultVariant.weight_unit)}` : null },
    { key: t("specPackage"), value: defaultVariant?.package?.name },
    { key: t("specFlavour"), value: currentFlavours.length ? currentFlavours.join(", ") : defaultVariant?.flavour?.name },
    { key: t("specServingSize"), value: product.nutrition?.serving_size_grams ? `${product.nutrition.serving_size_grams} g` : null },
    { key: t("specServings"), value: product.nutrition?.servings_per_container ? String(product.nutrition.servings_per_container) : null },
    { key: t("specCalories"), value: product.nutrition?.calories ? `${product.nutrition.calories} kcal` : null },
    { key: t("specSku"), value: defaultVariant?.sku },
  ];
  const manual = product.specifications ?? [];
  const taken = new Set(manual.map((row) => row.key.trim().toLowerCase()));
  const specifications = [
    ...manual,
    ...derived.filter((row): row is { key: string; value: string } => Boolean(row.value) && !taken.has(row.key.toLowerCase())),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <ProductJsonLd product={product} brandName={brandName} description={product.description} categoryName={categoryName} categoryHref={categoryHref} locale={(await getLocale()) as Locale} catalogName={tCatalog("title")} />
      <nav aria-label={t("breadcrumbLabel")} className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/products" className="transition-colors hover:text-primary">
          {tCatalog("title")}
        </Link>
        {categoryName && (
          <>
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            <Link href={categoryHref ?? `/products?category=${product.category_id}`} className="transition-colors hover:text-primary">
              {categoryName}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="truncate text-ink-muted">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-x-10 xl:grid-cols-[500px_minmax(0,1fr)]">
        {/*
          Phase 09.4c: pricing is now genuinely resolvable server-side
          (Phase 09.4/09.4b closed the PriceSnapshot issuance and
          customer-permission-bootstrap gaps) -- the real Add to Cart
          flow uses only product_variant_id/quantity from the client.
          The price shown here is per the *selected* variant, for
          reference only; the authoritative price still comes back
          from the backend after the price-attachment call when adding
          to cart, never sent from here.

          One client component renders both the gallery and the info
          column (a Fragment, so this grid's two-column layout is
          unaffected) -- Flavor/Size selection needs to update both
          together, atomically, from the one real resolved variant
          (see ProductPurchaseExperience's own docstring).
        */}
        <Suspense
          fallback={
            <>
              <Skeleton className="aspect-square w-full rounded-3xl" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-5 h-40 w-full rounded-2xl" />
              </div>
            </>
          }
        >
          <ProductPurchaseExperience product={product} categoryName={categoryName} brandName={brandName} isWishlisted={isWishlisted} extras={<TrustBar compact />} />
        </Suspense>
      </div>

      <div className="mt-10">
        <ProductTabs
          tabs={[
            {
              id: "descriptionTab",
              label: t("descriptionTab"),
              content: product.description ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">{product.description}</p>
              ) : (
                <p className="text-sm text-ink-muted">{t("noDescription")}</p>
              ),
            },
            {
              id: "specificationsTab",
              label: t("specificationsTab"),
              content:
                specifications.length > 0 ? (
                  <CompositionTable rows={specifications} />
                ) : (
                  <p className="text-sm text-ink-muted">{t("noSpecifications")}</p>
                ),
            },
            // Real, closed gap: supplement_facts/warnings/directions
            // already existed on the backend (edited via the admin's own
            // fieldsets) but no public read endpoint ever surfaced them
            // -- each tab only appears when that specific field is
            // actually filled in for this product, never an empty tab.
            ...(product.supplement_facts
              ? [{ id: "supplementFactsTab", label: t("supplementFactsTab"), content: <SupplementFactsSection text={product.supplement_facts} /> }]
              : []),
            ...(product.warnings
              ? [{
                  id: "warningsTab", label: t("warningsTab"),
                  content: (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-400/25 dark:bg-amber-400/10">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={1.75} aria-hidden="true" />
                      <p className="whitespace-pre-line text-sm leading-relaxed text-amber-800 dark:text-amber-200">{product.warnings}</p>
                    </div>
                  ),
                }]
              : []),
            ...(product.directions
              ? [{ id: "directionsTab", label: t("directionsTab"), content: <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">{product.directions}</p> }]
              : []),
            {
              id: "reviewsTab",
              label: t("reviewsTab"),
              badge: reviewsTotal > 0 ? `(${reviewsTotal})` : undefined,
              content: (
                <ReviewsSection
                  productId={product.id}
                  initialReviews={reviews}
                  initialTotalCount={reviewsTotal}
                  ratingAverage={product.rating_average}
                  ratingCount={product.rating_count}
                  isAuthenticated={Boolean(accessToken)}
                  loginHref={`/login?next=${encodeURIComponent(`/products/${slug}#reviews`)}`}
                />
              ),
            },
          ]}
        />
      </div>

      <RelatedProducts products={relatedProducts} />
    </div>
  );
}
