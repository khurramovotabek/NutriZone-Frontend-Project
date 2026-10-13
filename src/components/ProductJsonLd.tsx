import type { ProductCard } from "@/lib/api";
import { absoluteUrl } from "@/lib/site-url";

/**
 * schema.org Product markup for search engines (Google shows price, availability and stars in results).
 * Only facts the page already shows -- no invented ratings or prices.
 */
export function productJsonLd(product: ProductCard, brandName: string | null, description?: string | null): Record<string, unknown> {
  const defaultVariant = product.variants?.find((v) => v.is_default) ?? product.variants?.[0];
  const sku = defaultVariant?.sku;
  // The detail response carries stock per variant (list cards carry it on the product) -- any variant on hand counts.
  const inStock = product.variants?.length ? product.variants.some((v) => (v.stock_quantity ?? 0) > 0) : (product.stock_quantity ?? 0) > 0;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: absoluteUrl(`/products/${product.slug}`),
    ...(product.primary_image_path ? { image: [product.primary_image_path] } : {}),
    ...(description ? { description: description.slice(0, 500) } : {}),
    ...(sku ? { sku } : {}),
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    ...(product.price && product.currency
      ? {
          offers: {
            "@type": "Offer",
            price: Number(product.price).toFixed(0),
            priceCurrency: product.currency,
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: absoluteUrl(`/products/${product.slug}`),
          },
        }
      : {}),
    ...(product.rating_count > 0 && product.rating_average
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating_average, reviewCount: product.rating_count } }
      : {}),
  };
  return data;
}

export default function ProductJsonLd({ product, brandName, description }: { product: ProductCard; brandName: string | null; description?: string | null }) {
  // `<` escaped so a product text can never close the script tag.
  const json = JSON.stringify(productJsonLd(product, brandName, description)).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
