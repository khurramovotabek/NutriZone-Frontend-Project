"use client";

import { useTranslations } from "next-intl";
import type { ProductCard } from "@/lib/api";
import { formatWeight } from "@/lib/format-weight";

type Variant = NonNullable<ProductCard["variants"]>[number];

interface Props {
  variants: Variant[];
  selectedId: string;
  onChange: (variantId: string) => void;
  disabled?: boolean;
}

/**
 * Real Size (weight) selector -- built entirely from each variant's
 * own `weight_value`/`weight_unit` (see api.ts::ProductCard's own
 * docstring). Flavour is a Product-level tag now, not a per-variant
 * dimension (see FlavourSwitcher.tsx, which navigates across sibling
 * Products instead of switching a variant here). Renders nothing (the
 * caller falls back to a plain SKU list) when fewer than 2 purchasable
 * variants actually carry a real weight, so a product whose catalog
 * data hasn't been fully entered never breaks.
 */
export default function VariantSelector({ variants, selectedId, onChange, disabled = false }: Props) {
  const t = useTranslations("product");

  const withWeight = variants.filter((v) => v.weight_value !== null);
  if (withWeight.length < 2) return null;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-muted">{t("attributePackageSize")}</label>
      <div className="flex flex-wrap gap-2">
        {withWeight.map((v) => {
          const isSelected = selectedId === v.id;
          const label = formatWeight(v.weight_value, v.weight_unit) ?? v.sku;
          return (
            <button
              key={v.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(v.id)}
              aria-pressed={isSelected}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
                isSelected ? "nz-glass-strong text-primary ring-2 ring-primary" : "nz-glass text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
