"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Package, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getProductBySlug, searchProducts, type ProductCard as ProductCardData } from "@/lib/api";
import ProductMediaImage from "@/components/ProductMediaImage";

const DEBOUNCE_MS = 300;
const SUGGESTION_LIMIT = 6;

function variantLabel(variant: NonNullable<ProductCardData["variants"]>[number]): string {
  const size = variant.weight_value ? `${variant.weight_value} ${variant.weight_unit}` : null;
  return [size, variant.package?.name].filter(Boolean).join(" · ") || variant.sku;
}

/**
 * Replaces the old raw "paste a Product Variant ID" text input in the
 * store dashboard with a real search-and-pick UX -- backed by the
 * same production search endpoint the header SearchBar uses
 * (GET /api/v1/products/search via lib/api.ts's searchProducts()).
 *
 * Real, closed gap: a picked product used to always add its
 * `default_variant_id`, with no way to choose any OTHER real variant
 * (a different size/flavor of the exact same product) -- confirmed a
 * genuine product-catalog capability (ProductDetailSelector already
 * resolves every active variant with its own weight/price/stock, per
 * the storefront's own PDP size selector), just never reachable from
 * this picker. Once a product is picked, its full detail (`GET
 * /products/{slug}`, via `getProductBySlug`) is fetched to see how
 * many active variants it actually has: exactly one (the overwhelming
 * common case) skips straight to that variant, unchanged from before;
 * more than one shows a second "choose a variant" step, labeled by
 * real size/package/price/stock, before calling `onSelect`.
 */
export default function StoreProductPicker({
  onSelect,
  disabled,
}: {
  onSelect: (variantId: string, product: ProductCardData) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("myStore");
  const locale = useLocale();

  const [selected, setSelected] = useState<ProductCardData | null>(null);
  const [selectedVariantLabel, setSelectedVariantLabel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Results are tagged with the search they answer, so a too-short query
  // or one still in flight derives empty/loading instead of an effect
  // resetting state on every keystroke.
  const [found, setFound] = useState<{ key: string; list: ProductCardData[] } | null>(null);
  const trimmedQuery = query.trim();
  const searchKey = trimmedQuery.length >= 2 ? `${locale}:${trimmedQuery}` : null;
  const results = searchKey && found?.key === searchKey ? found.list : [];
  const loading = searchKey !== null && found?.key !== searchKey;
  const [open, setOpen] = useState(false);
  const [variantChoices, setVariantChoices] = useState<{ product: ProductCardData; variants: NonNullable<ProductCardData["variants"]> } | null>(null);
  const [resolvingVariants, setResolvingVariants] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trimmed.length < 2) return;

    const key = `${locale}:${trimmed}`;
    const thisRequestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(() => {
      searchProducts({ q: trimmed, pageSize: SUGGESTION_LIMIT, locale })
        .then((res) => {
          if (requestIdRef.current !== thisRequestId) return;
          setFound({ key, list: res.data });
        })
        .catch(() => {
          if (requestIdRef.current !== thisRequestId) return;
          setFound({ key, list: [] });
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, locale]);

  async function handlePick(product: ProductCardData) {
    if (!product.default_variant_id) return; // No purchasable variant yet -- nothing to add.
    setOpen(false);
    setResolvingVariants(true);
    try {
      const detail = await getProductBySlug(product.slug);
      const activeVariants = (detail.data.variants ?? []).filter((v) => v.status === "active");
      if (activeVariants.length > 1) {
        setVariantChoices({ product: detail.data, variants: activeVariants });
        return;
      }
    } catch {
      // Detail lookup failed -- fall through to the fast path below rather than blocking the whole pick.
    } finally {
      setResolvingVariants(false);
    }
    finalizePick(product, product.default_variant_id, null);
  }

  function finalizePick(product: ProductCardData, variantId: string, label: string | null) {
    setSelected(product);
    setSelectedVariantLabel(label);
    setVariantChoices(null);
    setQuery("");
    onSelect(variantId, product);
  }

  function handleClearSelection() {
    setSelected(null);
    setSelectedVariantLabel(null);
    setVariantChoices(null);
  }

  if (resolvingVariants) {
    return (
      <div className="nz-glass flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs text-ink-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} aria-hidden="true" />
      </div>
    );
  }

  if (variantChoices) {
    return (
      <div className="nz-glass-strong rounded-xl p-2">
        <div className="mb-1.5 flex items-center gap-2 px-1">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-surface-2">
            <ProductMediaImage src={variantChoices.product.primary_image_path} size="small" alt="" fit="contain" padding="p-0.5" fallbackIcon={<Package className="h-3.5 w-3.5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />} />
          </div>
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{variantChoices.product.name}</span>
        </div>
        <p className="mb-1.5 px-1 text-[11px] text-ink-soft">{t("chooseVariant")}</p>
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {variantChoices.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={v.stock_status === "out_of_stock"}
              onClick={() => finalizePick(variantChoices.product, v.id, variantLabel(v))}
              className="flex w-full items-center justify-between gap-2 rounded-lg p-2 text-left transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="truncate text-xs font-medium text-ink">{variantLabel(v)}</span>
              <span className="shrink-0 text-[11px] text-ink-soft">{v.stock_status === "out_of_stock" ? t("variantOutOfStock") : v.price ? `${v.price} ${v.currency}` : v.sku}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setVariantChoices(null)} className="mt-1 w-full rounded-lg p-1.5 text-center text-xs font-medium text-ink-soft transition-colors hover:text-ink">
          {t("chooseVariantBack")}
        </button>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="nz-glass flex items-center gap-2 rounded-lg py-1.5 pl-2 pr-3">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-surface-2">
          <ProductMediaImage src={selected.primary_image_path} size="small" alt="" fit="contain" padding="p-0.5" fallbackIcon={<Package className="h-3.5 w-3.5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />} />
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
          {selected.name}
          {selectedVariantLabel && <span className="ml-1.5 font-normal text-ink-soft">· {selectedVariantLabel}</span>}
        </span>
        <button type="button" onClick={handleClearSelection} disabled={disabled} className="shrink-0 text-xs font-medium text-ink-soft transition-colors hover:text-ink" aria-label={t("changeSelection")}>
          {t("changeSelection")}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("searchProducts")}
          className="nz-glass-input w-full rounded-lg py-2 pl-8 pr-8 text-sm"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft transition-colors hover:text-ink" aria-label={t("changeSelection")}>
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="nz-glass-strong absolute left-0 top-[calc(100%+6px)] z-20 max-h-72 w-[min(90vw,340px)] overflow-y-auto rounded-xl p-1.5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} aria-hidden="true" />
            </div>
          )}
          {!loading && results.length === 0 && <p className="px-2 py-4 text-center text-xs text-ink-muted">{t("noMatchesFound")}</p>}
          {!loading &&
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handlePick(product)}
                disabled={!product.default_variant_id}
                className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-2">
                  <ProductMediaImage src={product.primary_image_path} size="small" alt="" fit="contain" padding="p-1" fallbackIcon={<Package className="h-3.5 w-3.5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink">{product.name}</p>
                  {!product.default_variant_id && <p className="text-[11px] text-ink-soft">{t("noVariantAvailable")}</p>}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
