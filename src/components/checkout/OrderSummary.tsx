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
export function payableAfterCoins(total: string, coins: number): string {
  if (!coins) return total;
  const value = Math.max(0, Number(total) - coins);
  return value.toFixed(2);
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
 * Real, server-confirmed numbers only -- subtotal/discount/total come
 * directly from CheckoutPreview, never computed client-side. Delivery
 * is always shown as "Bepul" (free) because the real order-create API
 * has no delivery-cost/method field at all (confirmed in cart-api.ts's
 * CheckoutOrderResult/submitCheckout) -- there is nothing else it
 * could honestly be.
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

        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-muted">{pickup ? t("fulfilment.pickup") : t("delivery")}</span>
          <span className="text-sm font-medium text-success">
            {t("deliveryFree")}
          </span>
        </div>

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
                  payableAfterCoins(preview.total.amount, coins),
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
