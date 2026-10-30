import type { ProductCard } from "@/lib/api";
import type { Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/config";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import { breadcrumbJsonLd, clip } from "@/lib/seo";

/** The public offer's 14-day return window (section 7 of /terms), for Google's merchant listings -- shared with the
 *  Organization (SiteJsonLd). Delivery price is agreed per order, so no shippingDetails are claimed. */
export const RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "UZ",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 14,
};

type Variant = NonNullable<ProductCard["variants"]>[number];

const UNIT_LABEL: Record<string, string> = { g: "g", kg: "kg", ml: "ml", l: "l" };
function sizeOf(v: Variant): string | null {
  if (v.weight_value === null || v.weight_value === undefined) return null;
  const n = Number.isInteger(v.weight_value) ? String(v.weight_value) : String(Number(v.weight_value.toFixed(2)));
  return `${n} ${UNIT_LABEL[v.weight_unit] ?? v.weight_unit}`;
}

/**
 * schema.org for a product page -- Google shows price, availability and stars in results, and the
 * Catalog › Category › Product trail instead of the raw URL. A family of several variants (size × flavour)
 * is a ProductGroup whose `hasVariant` lists each one with its own SKU, GTIN, price and stock, as Google's
 * product-variant markup expects. Only facts the page already shows -- no invented ratings or prices.
 */
export function productJsonLd(product: ProductCard, brandName: string | null, description?: string | null, locale: Locale = "uz"): Record<string, unknown> {
  const url = absoluteUrl(localizedPath(`/products/${product.slug}`, locale));
  const variants = (product.variants ?? []).filter((v) => v.status === "active");
  const defaultVariant = variants.find((v) => v.is_default) ?? variants[0];
  const images = Array.from(new Set([product.primary_image_path, ...(product.gallery ?? []), ...(defaultVariant?.gallery ?? [])].filter((x): x is string => Boolean(x)))).slice(0, 6);
  // The store itself, defined once on the home page (SiteJsonLd) under this @id.
  const seller = { "@id": `${SITE_URL}/#organization` };
  const brand = brandName ? { brand: { "@type": "Brand", name: brandName } } : {};
  const rating = product.rating_count > 0 && product.rating_average
    ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating_average, reviewCount: product.rating_count, bestRating: 5, worstRating: 1 } }
    : {};
  const offerFor = (price: string | null | undefined, currency: string | null | undefined, inStock: boolean, offerUrl: string) =>
    price && Number(price) > 0 && currency
      ? { offers: { "@type": "Offer", price: Number(price).toFixed(0), priceCurrency: currency, availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", itemCondition: "https://schema.org/NewCondition", url: offerUrl, seller, hasMerchantReturnPolicy: RETURN_POLICY } }
      : {};
  const desc = description ? { description: clip(description, 500) } : {};

  if (variants.length > 1) {
    const sizes = new Set(variants.map(sizeOf).filter(Boolean));
    return {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      name: product.name,
      url,
      productGroupID: product.id,
      ...(images.length ? { image: images } : {}),
      ...desc,
      ...brand,
      ...rating,
      // flavour has no schema.org property of its own; it stays in each variant's name
      ...(sizes.size > 1 ? { variesBy: ["https://schema.org/size"] } : {}),
      hasVariant: variants.map((v) => {
        const label = [v.flavour?.name, sizeOf(v)].filter(Boolean).join(", ");
        const image = v.gallery?.[0] ?? v.flavour?.image_url ?? images[0];
        return {
          "@type": "Product",
          name: label ? `${product.name} (${label})` : product.name,
          sku: v.sku,
          ...(v.gtin ? { gtin: v.gtin } : {}),
          ...(sizeOf(v) ? { size: sizeOf(v) } : {}),
          ...(image ? { image } : {}),
          ...brand,
          ...offerFor(v.price, v.currency ?? product.currency, (v.stock_quantity ?? 0) > 0, `${url}?variant=${v.id}`),
        };
      }),
    };
  }

  const inStock = defaultVariant ? (defaultVariant.stock_quantity ?? 0) > 0 : (product.stock_quantity ?? 0) > 0;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    ...(images.length ? { image: images } : {}),
    ...desc,
    ...(defaultVariant?.sku ? { sku: defaultVariant.sku, mpn: defaultVariant.sku } : {}),
    ...(defaultVariant?.gtin ? { gtin: defaultVariant.gtin } : {}),
    ...(defaultVariant && sizeOf(defaultVariant) ? { size: sizeOf(defaultVariant) } : {}),
    ...brand,
    ...offerFor(defaultVariant?.price ?? product.price, defaultVariant?.currency ?? product.currency, inStock, url),
    ...rating,
  };
}

export default function ProductJsonLd({
  product, brandName, description, categoryName, categoryHref, locale = "uz", catalogName,
}: { product: ProductCard; brandName: string | null; description?: string | null; categoryName?: string | null; categoryHref?: string | null; locale?: Locale; catalogName?: string }) {
  const trail = [
    ...(catalogName ? [{ name: catalogName, path: "/products" }] : []),
    ...(categoryName && product.category_id ? [{ name: categoryName, path: categoryHref ?? `/categories/${product.category_id}` }] : []),
    { name: product.name, path: `/products/${product.slug}` },
  ];
  const data = [productJsonLd(product, brandName, description, locale), breadcrumbJsonLd(trail, locale)];
  // `<` escaped so a product text can never close the script tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
