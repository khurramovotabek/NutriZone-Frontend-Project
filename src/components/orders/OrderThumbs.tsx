"use client";

import { Package } from "lucide-react";
import ProductMediaImage from "@/components/ProductMediaImage";
import type { VariantDisplay } from "@/lib/variant-display";

/** Overlapping product photos for an order card; shows up to `max`, then a "+N" tile. */
export default function OrderThumbs({ variantIds, displays, max = 4 }: { variantIds: string[]; displays: Record<string, VariantDisplay>; max?: number }) {
  const shown = variantIds.slice(0, max);
  const rest = variantIds.length - shown.length;

  return (
    <div className="flex items-center">
      {shown.map((id, i) => {
        const display = displays[id];
        return (
          <span
            key={`${id}-${i}`}
            className="relative -ml-3 h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-surface bg-surface-2 shadow-sm first:ml-0"
            style={{ zIndex: shown.length - i }}
          >
            <ProductMediaImage
              src={display?.image ?? null}
              size="small"
              alt={display?.productName ?? ""}
              fit="contain"
              padding="p-1.5"
              fallbackIcon={<Package className="h-5 w-5 text-ink-soft" strokeWidth={1.4} aria-hidden="true" />}
            />
          </span>
        );
      })}
      {rest > 0 && (
        <span className="relative -ml-3 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-surface bg-surface-3 text-sm font-bold text-ink-muted">+{rest}</span>
      )}
    </div>
  );
}
