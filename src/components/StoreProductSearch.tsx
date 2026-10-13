"use client";

import { useMemo, useState } from "react";
import { Percent, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import { Select } from "@/components/ui";
import type { ProductCard as ProductCardData } from "@/lib/api";

import type { StoreProductItem } from "@/lib/store-api";

type SortOption = "name" | "stock" | "price" | "-price" | "-discount";

/**
 * Real, product-required capability: lets a visitor search AND filter
 * a single store's own product catalog on its detail page. This is
 * deliberately a client-side filter/sort over the `products` array
 * the store detail endpoint already returns in full (GET
 * /stores/{slug}) -- store catalogs are small, so no extra backend
 * endpoint or network round-trip is needed, and results are instant
 * (no debounce required for filtering an already-in-memory list).
 *
 * Filter/sort dimensions are what `StoreProductItem` carries: name,
 * sku, quantity, price and markdown (no category/brand fields).
 */
export default function StoreProductSearch({ products }: { products: StoreProductItem[] }) {
  const t = useTranslations("stores");
  const tCatalog = useTranslations("catalog");
  const [query, setQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const onSaleCount = useMemo(() => products.filter((p) => (p.discount_percent ?? 0) > 0).length, [products]);
  const [sortBy, setSortBy] = useState<SortOption>("name");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    let result = products;
    if (trimmed) {
      result = result.filter((p) => p.name.toLowerCase().includes(trimmed) || p.sku.toLowerCase().includes(trimmed));
    }
    if (inStockOnly) {
      result = result.filter((p) => p.quantity > 0);
    }
    if (onSaleOnly) {
      result = result.filter((p) => (p.discount_percent ?? 0) > 0);
    }
    const priceOf = (p: StoreProductItem) => (p.price ? Number(p.price) : null);
    result = result.slice().sort((a, b) => {
      if (sortBy === "stock") return b.quantity - a.quantity;
      if (sortBy === "-discount") return (b.discount_percent ?? 0) - (a.discount_percent ?? 0);
      if (sortBy === "price" || sortBy === "-price") {
        const pa = priceOf(a);
        const pb = priceOf(b);
        if (pa === null) return 1; // unpriced always last
        if (pb === null) return -1;
        return sortBy === "price" ? pa - pb : pb - pa;
      }
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [products, query, inStockOnly, onSaleOnly, sortBy]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchProductsPlaceholder")}
            className="nz-glass-input w-full rounded-xl py-2.5 pl-9 pr-9 text-sm"
            aria-label={t("searchProductsPlaceholder")}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft transition-colors hover:text-ink"
              aria-label={t("clearSearch")}
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setInStockOnly((v) => !v)}
          aria-pressed={inStockOnly}
          className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
            inStockOnly ? "border-primary/25 bg-primary-soft text-primary" : "border-border text-ink-muted hover:border-primary/40"
          }`}
        >
          {t("inStockOnly")}
        </button>

        {onSaleCount > 0 && (
          <button
            type="button"
            onClick={() => setOnSaleOnly((v) => !v)}
            aria-pressed={onSaleOnly}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
              onSaleOnly ? "border-rose-600 bg-rose-600 text-white" : "border-border text-ink-muted hover:border-rose-500/50 hover:text-rose-600"
            }`}
          >
            <Percent className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
            {tCatalog("onSaleOnly")}
            <span className={`rounded-full px-1.5 text-[11px] ${onSaleOnly ? "bg-white/20" : "bg-surface-3"}`}>{onSaleCount}</span>
          </button>
        )}

        <label className="sr-only" htmlFor="store-product-sort">
          {t("sortBy")}
        </label>
        <Select
          id="store-product-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          wrapperClassName="shrink-0"
          className="rounded-xl py-2 pl-3 pr-8 text-sm"
        >
          <option value="name">{t("sortName")}</option>
          <option value="stock">{t("sortStock")}</option>
          <option value="price">{tCatalog("sortPriceAsc")}</option>
          <option value="-price">{tCatalog("sortPriceDesc")}</option>
          {onSaleCount > 0 && <option value="-discount">{tCatalog("sortDiscount")}</option>}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-ink-muted">{t("noProductsMatchSearch")}</p>
      ) : (
        <ProductGrid dense>
          {filtered.map((product) => (
            <ProductCard
              key={product.product_variant_id}
              product={toProductCardData(product)}
              variant="compact"
              // Published products link to their own page (with this variant preselected); anything else falls back to a name search.
              href={product.product_slug ? `/products/${product.product_slug}?variant=${product.product_variant_id}` : `/products?q=${encodeURIComponent(product.name)}`}
            />
          ))}
        </ProductGrid>
      )}
    </div>
  );
}

/** Store items carry no brand or rating -- ProductCard hides those when absent. `default_variant_id` is the variant this store stocks, which is what AddToCartButton adds. */
function toProductCardData(item: StoreProductItem): ProductCardData {
  return {
    id: item.product_id,
    slug: item.product_slug ?? item.product_id,
    name: item.name,
    status: "published",
    brand_id: null,
    category_id: null,
    primary_image_path: item.image_url,
    default_variant_id: item.product_variant_id,
    created_at: "",
    price: item.price ?? null,
    currency: item.currency ?? null,
    compare_at_price: item.compare_at_price ?? null,
    discount_percent: item.discount_percent ?? null,
    stock_quantity: item.quantity,
    stock_status: item.quantity <= 0 ? "out_of_stock" : item.quantity <= 10 ? "low_stock" : "in_stock",
    rating_average: null,
    rating_count: 0,
  };
}
