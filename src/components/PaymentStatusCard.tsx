"use client";

import { Banknote, CheckCircle2, Clock, HelpCircle, MinusCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Order } from "@/lib/orders-api";
import type { ComponentType } from "react";

type PaymentDisplayKey =
  | "succeeded"
  | "payOnDelivery"
  | "cancelled"
  | "failed"
  | "failedFromPending"
  | "confirming"
  | "pendingRequired"
  | "pending"
  | "unknown";

/** Pure derivation from real backend Order/PaymentReference status -- returns a translation-key selector, never a hardcoded string, so this stays testable independent of i18n. */
export function derivePaymentDisplayKey(order: Order): { state: "pending" | "succeeded" | "cod" | "failed" | "cancelled" | "unknown"; key: PaymentDisplayKey } {
  const latestPayment = order.payment_references[order.payment_references.length - 1];
  const paidOnline = latestPayment?.status === "captured";

  if (order.status === "delivered" || order.status === "completed" || ((order.status === "confirmed" || order.status === "processing" || order.status === "shipped") && paidOnline)) {
    return { state: "succeeded", key: "succeeded" };
  }
  // Cash on delivery (the storefront's payment method): an accepted order is not "paid" until the courier hands it over.
  if (order.status === "confirmed" || order.status === "processing" || order.status === "shipped") {
    return { state: "cod", key: "payOnDelivery" };
  }
  if (order.status === "cancelled") {
    return { state: "cancelled", key: "cancelled" };
  }
  if (order.status === "failed") {
    return { state: "failed", key: "failed" };
  }
  if (order.status === "pending_payment") {
    if (!latestPayment) return { state: "pending", key: "pendingRequired" };
    if (latestPayment.status === "failed") return { state: "failed", key: "failedFromPending" };
    if (latestPayment.status === "captured" || latestPayment.status === "authorized") return { state: "pending", key: "confirming" };
    return { state: "pending", key: "pending" };
  }
  return { state: "unknown", key: "unknown" };
}

const TITLE_KEYS: Record<PaymentDisplayKey, string> = {
  succeeded: "successTitle",
  payOnDelivery: "codTitle",
  cancelled: "cancelledTitle",
  failed: "failedTitle",
  failedFromPending: "failedTitle",
  confirming: "confirmingTitle",
  pendingRequired: "requiredTitle",
  pending: "pendingTitle",
  unknown: "unknownTitle",
};

const DESCRIPTION_KEYS: Record<PaymentDisplayKey, string> = {
  succeeded: "successDescription",
  payOnDelivery: "codDescription",
  cancelled: "cancelledDescription",
  failed: "failedDescription",
  failedFromPending: "failedDescription",
  confirming: "confirmingDescription",
  pendingRequired: "requiredDescription",
  pending: "pendingDescription",
  unknown: "unknownDescription",
};

const STATE_STYLES: Record<string, { icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>; className: string }> = {
  pending: { icon: Clock, className: "border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300" },
  succeeded: { icon: CheckCircle2, className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  cod: { icon: Banknote, className: "border-primary/25 bg-primary-soft text-primary" },
  failed: { icon: XCircle, className: "border-red-300/60 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300" },
  cancelled: { icon: MinusCircle, className: "border-border bg-surface-2 text-ink-muted" },
  unknown: { icon: HelpCircle, className: "border-border bg-surface-2 text-ink-muted" },
};

export default function PaymentStatusCard({ order, className = "rounded-xl p-4" }: { order: Order; className?: string }) {
  const t = useTranslations("payment");
  const { state, key } = derivePaymentDisplayKey(order);
  // a pickup order is paid at the counter, not to a courier
  const pickupCash = key === "payOnDelivery" && order.fulfilment_method === "pickup";
  const style = STATE_STYLES[state];
  const Icon = style.icon;

  return (
    <div role="status" aria-live="polite" className={`border ${className} ${style.className}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden={true} />
        <h2 className="text-base font-semibold">{t((pickupCash ? "codPickupTitle" : TITLE_KEYS[key]) as "pendingTitle")}</h2>
      </div>
      <p className="mt-1 text-sm opacity-90">{t((pickupCash ? "codPickupDescription" : DESCRIPTION_KEYS[key]) as "pendingDescription")}</p>
      {state === "succeeded" && <p className="mt-2 text-sm font-medium">Order #{order.order_number}</p>}
      {state === "failed" && <p className="mt-2 text-xs opacity-75">{t("failedRetryNote")}</p>}
    </div>
  );
}
