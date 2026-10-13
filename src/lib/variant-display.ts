"use client";

import { useEffect, useState } from "react";
import { formatWeight } from "@/lib/format-weight";
import { getCachedVariantDisplay } from "@/lib/product-display-cache";

/** What an order/cart line needs to show the real product (lines only carry `product_variant_id`). */
export interface VariantDisplay {
  variantId: string;
  productName: string;
  productSlug: string | null;
  brandName: string | null;
  image: string | null;
  /** e.g. "2.27 kg · Jar" */
  variantLabel: string | null;
  /** False for a hidden/archived product -- show it, but don't link to its page. */
  linkable: boolean;
}

interface ApiVariantDisplay {
  variant_id: string;
  product_slug: string | null;
  product_name: string;
  brand_name: string | null;
  image_url: string | null;
  weight_value: number | null;
  weight_unit: string | null;
  package: { id: string; name: string } | null;
  is_published: boolean;
}

function fromApi(row: ApiVariantDisplay): VariantDisplay {
  const label = [formatWeight(row.weight_value, row.weight_unit), row.package?.name].filter(Boolean).join(" · ");
  return {
    variantId: row.variant_id,
    productName: row.product_name,
    productSlug: row.product_slug,
    brandName: row.brand_name,
    image: row.image_url,
    variantLabel: label || null,
    linkable: row.is_published && Boolean(row.product_slug),
  };
}

function fromCache(variantId: string): VariantDisplay | null {
  const cached = getCachedVariantDisplay(variantId);
  if (!cached) return null;
  return { variantId, productName: cached.productName, productSlug: cached.productSlug, brandName: cached.brandName, image: cached.image, variantLabel: cached.variantLabel, linkable: Boolean(cached.productSlug) };
}

/**
 * Resolves display info for the given variant ids from the catalog
 * (`/api/products/variants`, a same-origin proxy), falling back to this browser's product cache while
 * loading or if the request fails. Returns a lookup by variant id.
 */
export function useVariantDisplays(variantIds: string[], locale: string): Record<string, VariantDisplay> {
  const key = [...new Set(variantIds)].sort().join(",");
  const [fetched, setFetched] = useState<{ key: string; byId: Record<string, VariantDisplay> } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/products/variants?ids=${encodeURIComponent(key)}&locale=${locale}`)
      .then((res) => res.json())
      .then((body: { success: boolean; data?: ApiVariantDisplay[] }) => {
        if (cancelled || !body.success || !body.data) return;
        setFetched({ key, byId: Object.fromEntries(body.data.map((row) => [row.variant_id, fromApi(row)])) });
      })
      .catch(() => {
        // Cache fallback below still applies.
      });
    return () => {
      cancelled = true;
    };
  }, [key, locale]);

  const resolved = fetched?.key === key ? fetched.byId : {};
  const result: Record<string, VariantDisplay> = {};
  for (const id of key ? key.split(",") : []) {
    const display = resolved[id] ?? fromCache(id);
    if (display) result[id] = display;
  }
  return result;
}
