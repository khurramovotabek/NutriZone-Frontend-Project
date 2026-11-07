"use client";

import { useTranslations } from "next-intl";
import { formatPrice } from "@/components/PriceTag";
import type { CheckoutPreview } from "@/lib/cart-api";
import { Card } from "@/components/ui";
import OrderItem from "@/components/checkout/OrderItem";
import CouponInput from "@/components/checkout/CouponInput";
import CoinIcon from "@/components/loyalty/CoinIcon";
import { OrderCoinEarn } from "@/components/loyalty/ProductCoinReward";

/** Display-only total after coins (1 coin = 1 so'm); the server recomputes the real payable amount at order creation. */
export function payableAfterCoins(total: string, coins: number, deliveryFee = 0): string {
  if (!coins && !deliveryFee) return total;
  const value = Math.max(0, Number(total) - coins) + deliveryFee;
  return value.toFixed(2);
}

/** The delivery fee the server quoted for the chosen address (0 for pickup; 0 until an address is chosen). */
export function deliveryFeeOf(preview: CheckoutPreview, pickup: boolean): number {
  if (pickup) return 0;
  return preview.delivery?.method === "delivery" ? Number(preview.delivery.fee) || 0 : 0;
}

/** "Delivery · Tashkent city (Yandex Dostavka · today or tomorrow) — 24 000 so'm"; pickup is free. */
export function DeliveryLine({ preview, pickup }: { preview: CheckoutPreview; pickup: boolean }) {
  const t = useTranslations("checkout");
  const q = preview.delivery;
  const currency = preview.total?.currency ?? preview.currency;
  if (pickup) {
    return (
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-muted">{t("fulfilment.pickup")}</span>
        <span className="text-sm font-medium text-success">{t("deliveryFree")}</span>
      </div>
    );
  }
  if (!q || q.method !== "delivery") {
    return (
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-muted">{t("delivery")}</span>
        <span className="text-right text-xs text-ink-soft">{t("deliveryQuote.chooseAddress")}</span>
      </div>
    );
  }
  const fee = Number(q.fee) || 0;
  const zone = q.zone === "tashkent" ? t("deliveryQuote.tashkent") : t("deliveryQuote.regions");
  const details = [q.carrier, q.eta].filter(Boolean).join(" · ");
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="min-w-0 text-sm text-ink-muted">
        {t("delivery")} · {zone}
        {details && <span className="block text-xs text-ink-soft">{details}{q.zone === "regions" && q.weight_kg ? ` · ${t("deliveryQuote.weight", { kg: q.weight_kg.toFixed(1) })}` : ""}</span>}
      </span>
      <span className={`shrink-0 text-sm font-medium ${fee ? "text-ink" : "text-success"}`}>{fee ? formatPrice(fee, currency) : t("deliveryFree")}</span>
    </div>
  );
}

export function CoinsLine({
  coins,
  currency,
}: {
  coins: number;
  currency: string;
}) {
  const t = useTranslations("checkout.coins");
  return (
    <div className="flex items-baseline justify-between">
      <span className="flex items-center gap-1.5 text-sm text-ink-muted">
        <CoinIcon size={16} />
        {t("line")}
      </span>
      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
        &minus;{formatPrice(coins, currency)}
      </span>
    </div>
  );
}

const ISSUE_KEYS = new Set([
  "empty_cart",
  "cart_locked",
  "cart_expired",
  "item_out_of_stock",
  "item_price_changed",
  "item_invalid",
  "no_price_snapshot",
  "currency_mismatch",
]);

/**
 * Server numbers only -- subtotal/discount/total and the delivery quote come from CheckoutPreview (the delivery fee
 * is quoted for the chosen address: Tashkent city by Yandex, the regions by BTS; pickup is free).
 */
export default function OrderSummary({
  preview,
  onPreviewChange,
  showCoupon = true,
  coins = 0,
  pickup = false,
}: {
  /** Picked up at a store: the delivery line reads "Pickup — free". */
  pickup?: boolean;
  preview: CheckoutPreview;
  onPreviewChange: () => Promise<void>;
  showCoupon?: boolean;
  coins?: number;
}) {
  const t = useTranslations("checkout");

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-ink-muted">
        {t("orderSummary")}
      </h2>

      <div className="space-y-3">
        {preview.items
          .filter((i) => i.status !== "removed")
          .map((item) => (
            <OrderItem key={item.id} item={item} />
          ))}
      </div>

      {preview.issues.length > 0 && (
        <ul
          role="alert"
          aria-live="polite"
          className="mt-3 space-y-1 border-t border-border pt-3"
        >
          {preview.issues.map((issue, i) => (
            <li
              key={i}
              className={`text-sm ${issue.severity === "error" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
            >
              {ISSUE_KEYS.has(issue.code)
                ? t(`issues.${issue.code}` as "issues.empty_cart")
                : issue.message}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        {preview.subtotal ? (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-muted">{t("subtotal")}</span>
            <span className="text-sm font-medium text-ink">
              {formatPrice(preview.subtotal.amount, preview.subtotal.currency)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t("priceUnavailable")}
          </p>
        )}

        {preview.discount && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-muted">{t("discount")}</span>
            <span className="text-sm font-medium text-primary">
              &minus;
              {formatPrice(preview.discount.amount, preview.discount.currency)}
            </span>
          </div>
        )}

        <DeliveryLine preview={preview} pickup={pickup} />

        {showCoupon && preview.subtotal && (
          <div className="pt-1">
            <CouponInput
              appliedCoupons={preview.applied_coupons}
              onApplied={onPreviewChange}
              onRemoved={onPreviewChange}
            />
          </div>
        )}

        {coins > 0 && (
          <CoinsLine
            coins={coins}
            currency={preview.total?.currency ?? preview.currency}
          />
        )}

        {preview.total && (
          <>
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-base font-semibold text-ink">
                {t("total")}
              </span>
              <span className="text-xl font-bold text-ink">
                {formatPrice(
                  payableAfterCoins(preview.total.amount, coins, deliveryFeeOf(preview, pickup)),
                  preview.total.currency,
                )}
              </span>
            </div>
            <OrderCoinEarn
              amount={Number(payableAfterCoins(preview.total.amount, coins))}
              currency={preview.total.currency}
            />
          </>
        )}

        <p className="text-xs text-ink-soft">{t("deliveryNote")}</p>
      </div>
    </Card>
  );
}
