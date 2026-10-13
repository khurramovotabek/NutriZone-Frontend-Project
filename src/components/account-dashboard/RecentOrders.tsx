"use client";

import { ChevronRight, Package, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Order } from "@/lib/orders-api";
import { Badge, Button } from "@/components/ui";
import { formatMoney, orderItemCount, orderTotal } from "@/lib/account-insights";
import { formatDate } from "@/lib/dates";
import { STATUS_TONE } from "@/components/orders/order-status";

/** Latest orders as a single glass list -- number, date, item count, total and status per row. */
export default function RecentOrders({ orders, totalCount }: { orders: Order[]; totalCount: number }) {
  const t = useTranslations("account.dashboardPage");
  const tOrders = useTranslations("orders");
  const locale = useLocale();

  return (
    <section className="nz-glass overflow-hidden rounded-3xl">
      <header className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight text-ink">{t("recentOrders")}</h2>
        {totalCount > 0 && (
          <Link href="/orders" className="group flex shrink-0 items-center gap-0.5 whitespace-nowrap text-sm font-semibold text-primary">
            {t("viewAll")}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShoppingBag className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="mt-4 font-semibold text-ink">{t("noOrdersTitle")}</p>
          <p className="mt-1 max-w-xs text-sm text-ink-muted">{t("noOrdersText")}</p>
          <Link href="/products" className="mt-5">
            <Button variant="primary">{tOrders("continueShopping")}</Button>
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border/70">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.order_number}`} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2/60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-muted transition-colors group-hover:bg-primary-soft group-hover:text-primary">
                  <Package className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">#{order.order_number}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {order.placed_at ? formatDate(order.placed_at, locale, "date") : ""}
                    <span className="mx-1.5">·</span>
                    {t("itemsCount", { count: orderItemCount(order) })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-bold tabular-nums text-ink">{formatMoney(orderTotal(order), order.currency)}</span>
                  <Badge tone={STATUS_TONE[order.status] ?? "neutral"}>{tOrders(`status.${order.status}` as "status.draft")}</Badge>
                </div>
                <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 sm:block" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
