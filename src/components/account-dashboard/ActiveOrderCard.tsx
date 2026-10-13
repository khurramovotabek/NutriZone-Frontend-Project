"use client";

import { ChevronRight, Truck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Order } from "@/lib/orders-api";
import { formatMoney, orderItemCount, orderTotal } from "@/lib/account-insights";
import OrderProgress from "@/components/orders/OrderProgress";
import { ORDER_STEPS, orderStepIndex } from "@/components/orders/order-status";


/** The customer's most recent in-flight order with a delivery stepper. */
export default function ActiveOrderCard({ order, extraCount }: { order: Order; extraCount: number }) {
  const t = useTranslations("account.dashboardPage");
  const current = orderStepIndex(order.status) ?? 0;

  return (
    <section className="nz-glass relative overflow-hidden rounded-3xl p-5">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgba(var(--nz-primary-rgb),0.18)] blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="nz-cta flex h-10 w-10 items-center justify-center rounded-xl">
            <Truck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              {t("activeOrderTitle")}
              {extraCount > 0 && <span className="ml-1.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-primary">+{extraCount}</span>}
            </p>
            <p className="font-semibold text-ink">#{order.order_number}</p>
          </div>
        </div>
        <Link href={`/orders/${order.order_number}`} className="group flex items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft">
          {t("trackOrder")}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      <OrderProgress current={current} className="relative mt-5" />

      <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-sm">
        <span className="min-w-0 truncate">
          <span className="font-semibold text-primary">{t(`steps.${ORDER_STEPS[current]}`)}</span>
          <span className="text-ink-soft"> · {t("itemsCount", { count: orderItemCount(order) })}</span>
        </span>
        <span className="font-bold tabular-nums text-ink">{formatMoney(orderTotal(order), order.currency)}</span>
      </div>
    </section>
  );
}
