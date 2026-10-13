"use client";

import { AtSign, LoaderCircle, MapPin, MessageSquare, Phone, Store as StoreIcon, User } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PaymentMethod } from "@/lib/payments-api";
import { methodName } from "@/components/checkout/PaymentMethodCard";
import { formatPrice } from "@/components/PriceTag";
import type { Address } from "@/lib/geo-api";
import type { CheckoutPreview } from "@/lib/cart-api";
import { Button, Card } from "@/components/ui";
import OrderItem from "@/components/checkout/OrderItem";
import { CoinsLine, payableAfterCoins } from "@/components/checkout/OrderSummary";

/** Step 3 -- a final, read-only review of everything the order will contain, per this task's own "not another generic form" requirement. Every value shown here was already collected/validated in steps 1-2. */
export default function CheckoutReview({
  address, recipientName, recipientPhone, recipientTelegramUsername, comment, preview, onEditDelivery, onEditPayment, onConfirm, submitting, submitError, coins = 0,
  paymentMethod = null, redirecting = false, pickupStore = null,
}: {
  /** Pickup at a branch: shown instead of the delivery address. */
  pickupStore?: { name: string; address: string; today: string } | null;
  coins?: number;
  paymentMethod?: PaymentMethod | null;
  redirecting?: boolean;
  address: Address | null;
  recipientName: string;
  recipientPhone: string;
  recipientTelegramUsername: string;
  comment: string;
  preview: CheckoutPreview;
  onEditDelivery: () => void;
  onEditPayment: () => void;
  onConfirm: () => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const t = useTranslations("checkout");

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
            {pickupStore ? <StoreIcon className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" /> : <MapPin className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />}
            {pickupStore ? t("fulfilment.pickupAt") : t("deliveryAddress")}
          </h2>
          <button type="button" onClick={onEditDelivery} className="text-sm font-medium text-primary transition-colors hover:brightness-110">
            {t("edit")}
          </button>
        </div>
        {pickupStore ? (
          <p className="text-sm text-ink-muted"><b className="text-ink">{pickupStore.name}</b>{pickupStore.address ? ` — ${pickupStore.address}` : ""}{pickupStore.today ? ` · ${pickupStore.today}` : ""}</p>
        ) : (
          <p className="text-sm text-ink-muted">{address ? address.formatted_single_line ?? address.line1 : ""}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-soft">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
            {recipientName}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
            {recipientPhone}
          </span>
          {recipientTelegramUsername.trim() && (
            <span className="flex items-center gap-1">
              <AtSign className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
              {recipientTelegramUsername.trim()}
            </span>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink-muted">{t("items")}</h2>
        <div className="space-y-3">
          {preview.items.filter((i) => i.status !== "removed").map((item) => (
            <OrderItem key={item.id} item={item} />
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-muted">{t("paymentMethod")}</h2>
          <button type="button" onClick={onEditPayment} className="text-sm font-medium text-primary transition-colors hover:brightness-110">
            {t("edit")}
          </button>
        </div>
        <p className="flex items-center gap-3 text-sm text-ink">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
          <img src={`/payments/${paymentMethod?.key ?? "cash"}.svg`} alt="" className="h-8 w-12 rounded-md shadow-sm" />
          <span>
            <span className="block font-semibold">{paymentMethod ? methodName(paymentMethod, pickupStore ? t("cashAtStore") : t("cashOnDelivery")) : pickupStore ? t("cashAtStore") : t("cashOnDelivery")}</span>
            <span className="block text-xs text-ink-muted">{paymentMethod?.online ? t("pay.secure", { name: methodName(paymentMethod.via ? { key: paymentMethod.via, name: "" } : paymentMethod, "") }) : t("pay.secureCash")}</span>
          </span>
        </p>
      </Card>

      {comment.trim() && (
        <Card>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-muted">
            <MessageSquare className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
            {t("comment")}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-ink-muted">&ldquo;{comment.trim()}&rdquo;</p>
        </Card>
      )}

      <Card>
        {coins > 0 && preview.total && (
          <div className="mb-3 space-y-2 border-b border-border pb-3">
            <div className="flex items-baseline justify-between text-sm text-ink-muted">
              <span>{t("subtotal")}</span>
              <span>
                {formatPrice(preview.total.amount, preview.total.currency)}
              </span>
            </div>
            <CoinsLine coins={coins} currency={preview.total.currency} />
          </div>
        )}
        {preview.total && (
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold text-ink">{t("total")}</span>
            <span className="text-xl font-bold text-ink">
              {formatPrice(payableAfterCoins(preview.total.amount, coins), preview.total.currency)}
            </span>
          </div>
        )}

        {submitError && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {submitError}
          </p>
        )}

        <Button onClick={onConfirm} disabled={submitting || redirecting} variant="primary" className="mt-4 w-full">
          {submitting && <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />}
          {redirecting ? t("pay.redirecting") : submitting ? t("submitting") : paymentMethod?.online ? t("pay.placeAndPay") : t("confirmOrder")}
        </Button>
      </Card>
    </div>
  );
}
