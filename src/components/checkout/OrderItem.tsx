"use client";

import { Package } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CartItem } from "@/lib/cart-api";
import { getCachedVariantDisplay } from "@/lib/product-display-cache";
import { formatMoney } from "@/lib/format-money";
import ProductMediaImage from "@/components/ProductMediaImage";

/**
 * One real cart line -- image/name/variant come from the opportunistic
 * display cache (see product-display-cache.ts) since the Cart API
 * itself never returns them (confirmed: CartItem only carries
 * product_variant_id). A cache miss (e.g. a cart opened on a different
 * device) shows a real generic package icon and the item's own short
 * id -- never a fabricated name.
 */
export default function OrderItem({ item }: { item: CartItem }) {
  const t = useTranslations("checkout");
  const cached = getCachedVariantDisplay(item.product_variant_id);
  const price = formatMoney(item.price_reference?.unit_amount, item.price_reference?.currency);

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        <ProductMediaImage
          src={cached?.image ?? null}
          size="small"
          alt={cached?.productName ?? t("genericItem")}
          fit="contain"
          padding="p-1.5"
          fallbackIcon={<Package className="h-6 w-6 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium text-ink">{cached?.productName ?? t("genericItem")}</p>
        {cached?.variantLabel && <p className="line-clamp-1 text-xs text-ink-soft">{cached.variantLabel}</p>}
        {!cached && <p className="text-xs text-ink-soft">{t("variantIdShort", { id: item.product_variant_id.slice(0, 8) })}</p>}
        <p className="mt-0.5 text-xs text-ink-muted">{t("quantityTimes", { quantity: item.quantity })}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-ink">{price ?? t("priceUnavailableShort")}</p>
    </div>
  );
}
