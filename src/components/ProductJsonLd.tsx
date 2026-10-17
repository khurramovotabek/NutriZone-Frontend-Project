import type { ProductCard } from "@/lib/api";
import type { Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/config";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import { breadcrumbJsonLd, clip } from "@/lib/seo";

/**
 * schema.org Product (+ BreadcrumbList) for search engines -- Google shows price, availability and stars in
 * results, and the Catalog › Category › Product trail instead of the raw URL.
 * Only facts the page already shows -- no invented ratings or prices.
 */
export function productJsonLd(product: ProductCard, brandName: string | null, description?: string | null, locale: Locale = "uz"): Record<string, unknown> {
  const url = absoluteUrl(localizedPath(`/products/${product.slug}`, locale));
  const defaultVariant = product.variants?.find((v) => v.is_default) ?? product.variants?.[0];
  const sku = defaultVariant?.sku;
  // The detail response carries stock per variant (list cards carry it on the product) -- any variant on hand counts.
  const inStock = product.variants?.length ? product.variants.some((v) => (v.stock_quantity ?? 0) > 0) : (product.stock_quantity ?? 0) > 0;
  const images = Array.from(new Set([product.primary_image_path, ...(product.gallery ?? []), ...(defaultVariant?.gallery ?? [])].filter((x): x is string => Boolean(x)))).slice(0, 6);
  const availability = inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  // The store itself, defined once on the home page (SiteJsonLd) under this @id.
  const seller = { "@id": `${SITE_URL}/#organization` };
  const prices = (product.variants ?? []).map((v) => Number(v.price)).filter((n) => Number.isFinite(n) && n > 0);
  const currency = product.currency ?? product.variants?.find((v) => v.currency)?.currency ?? null;

  let offers: Record<string, unknown> | undefined;
  if (prices.length > 1 && Math.min(...prices) !== Math.max(...prices) && currency) {
    offers = { "@type": "AggregateOffer", lowPrice: Math.min(...prices).toFixed(0), highPrice: Math.max(...prices).toFixed(0), offerCount: prices.length, priceCurrency: currency, availability, url, seller };
  } else if (product.price && currency) {
    offers = { "@type": "Offer", price: Number(product.price).toFixed(0), priceCurrency: currency, availability, itemCondition: "https://schema.org/NewCondition", url, seller };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    ...(images.length ? { image: images } : {}),
    ...(description ? { description: clip(description, 500) } : {}),
    ...(sku ? { sku, mpn: sku } : {}),
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    ...(offers ? { offers } : {}),
    ...(product.rating_count > 0 && product.rating_average
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating_average, reviewCount: product.rating_count, bestRating: 5, worstRating: 1 } }
      : {}),
  };
}

export default function ProductJsonLd({
  product, brandName, description, categoryName, locale = "uz", catalogName,
}: { product: ProductCard; brandName: string | null; description?: string | null; categoryName?: string | null; locale?: Locale; catalogName?: string }) {
  const trail = [
    ...(catalogName ? [{ name: catalogName, path: "/products" }] : []),
    ...(categoryName && product.category_id ? [{ name: categoryName, path: `/categories/${product.category_id}` }] : []),
    { name: product.name, path: `/products/${product.slug}` },
  ];
  const data = [productJsonLd(product, brandName, description, locale), breadcrumbJsonLd(trail, locale)];
  // `<` escaped so a product text can never close the script tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
