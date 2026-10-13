"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ChevronRight, LoaderCircle, PackageCheck, Package, RotateCcw, Search, ShoppingBag, Truck, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Order } from "@/lib/orders-api";
import { Badge, Button, ErrorState, Skeleton } from "@/components/ui";
import FitMoney from "@/components/FitMoney";
import AccountLayout from "@/components/AccountLayout";
import OrderProgress from "@/components/orders/OrderProgress";
import OrderThumbs from "@/components/orders/OrderThumbs";
import { STATUS_TONE, orderFilterBucket, orderStepIndex, type OrderFilter } from "@/components/orders/order-status";
import { useReorder } from "@/components/orders/useReorder";
import { computeSpendSummary, formatMoney, orderItemCount, orderTotal } from "@/lib/account-insights";
import { formatDate } from "@/lib/dates";
import { useVariantDisplays, type VariantDisplay } from "@/lib/variant-display";

const FILTERS: OrderFilter[] = ["all", "active", "delivered", "cancelled"];

function placedTime(o: Order): number {
  return o.placed_at ? new Date(o.placed_at).getTime() : 0;
}

export default function OrdersPage() {
  const t = useTranslations("orders");
  const locale = useLocale();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const { reorder, pendingOrderId, resultFor } = useReorder();

  useEffect(() => {
    fetch("/api/orders")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) {
          setError(res.status === 401 ? "login" : "load");
          return;
        }
        setOrders(body.data);
      })
      .catch(() => setError("connection"))
      .finally(() => setLoading(false));
  }, []);

  const allVariantIds = useMemo(() => (orders ?? []).flatMap((o) => o.lines.filter((l) => l.status === "active").map((l) => l.product_variant_id)), [orders]);
  const displays = useVariantDisplays(allVariantIds, locale);

  if (loading) {
    return (
      <AccountLayout>
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="mt-6 h-12 w-full rounded-2xl" />
        <div className="mt-4 space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-3xl" />
          ))}
        </div>
      </AccountLayout>
    );
  }

  if (error) {
    const message = error === "login" ? t("loginPrompt") : error === "connection" ? t("connectionError") : t("loadError");
    return (
      <ErrorState
        message={message}
        action={
          error === "login" && (
            <Link href="/login?next=/orders">
              <Button variant="primary">{t("goToLogin")}</Button>
            </Link>
          )
        }
      />
    );
  }

  const list = orders ?? [];
  const spend = computeSpendSummary(list);
  const counts: Record<OrderFilter, number> = { all: list.length, active: 0, delivered: 0, cancelled: 0 };
  for (const o of list) {
    const bucket = orderFilterBucket(o.status);
    if (bucket) counts[bucket] += 1;
  }

  const needle = query.trim().toLowerCase();
  const visible = list
    .filter((o) => filter === "all" || orderFilterBucket(o.status) === filter)
    .filter((o) => {
      if (!needle) return true;
      if (o.order_number.toLowerCase().includes(needle)) return true;
      return o.lines.some((l) => displays[l.product_variant_id]?.productName.toLowerCase().includes(needle));
    })
    .sort((a, b) => (newestFirst ? placedTime(b) - placedTime(a) : placedTime(a) - placedTime(b)));

  // Month headings ("2026-yil oktabr") over the visible, sorted list.
  const groups: { key: string; label: string; orders: Order[] }[] = [];
  for (const o of visible) {
    const d = o.placed_at ? new Date(o.placed_at) : null;
    const key = d ? `${d.getFullYear()}-${d.getMonth()}` : "none";
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: d ? formatDate(d, locale, "monthYear") : "", orders: [] };
      groups.push(group);
    }
    group.orders.push(o);
  }

  return (
    <AccountLayout>
      {/* Header */}
      <section className="nz-glass nz-rise relative overflow-hidden rounded-3xl">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_0%_0%,rgba(var(--nz-primary-rgb),0.18),transparent_60%)]" />
          <div className="nz-orb -right-16 -top-24 h-56 w-56 bg-[rgba(var(--nz-primary-rgb),0.2)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--nz-primary-rgb),0.5)] to-transparent" />
        </div>
        <div className="relative p-5 sm:p-7">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("list.subtitle")}</p>
          <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-border/70 bg-surface/55 backdrop-blur-sm sm:grid-cols-4">
            <HeaderStat icon={Package} label={t("list.statTotal")} value={String(list.length)} />
            <HeaderStat icon={Wallet} label={t("list.statSpent")} value={spend.countedOrders > 0 ? <FitMoney amount={spend.totalSpent} currency={spend.currency} /> : "—"} />
            <HeaderStat icon={Truck} label={t("list.statActive")} value={String(counts.active)} />
            <HeaderStat icon={PackageCheck} label={t("list.statDelivered")} value={String(counts.delivered)} />
          </dl>
        </div>
      </section>

      {list.length === 0 ? (
        <section className="nz-glass mt-6 flex flex-col items-center rounded-3xl px-6 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShoppingBag className="h-8 w-8" strokeWidth={1.4} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink">{t("emptyTitle")}</h2>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">{t("emptyDescription")}</p>
          <Link href="/products" className="mt-6">
            <Button variant="primary">{t("continueShopping")}</Button>
          </Link>
        </section>
      ) : (
        <>
          {/* Toolbar */}
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={2} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("list.searchPlaceholder")}
                aria-label={t("list.searchPlaceholder")}
                className="nz-glass-input w-full rounded-2xl py-3 pl-11 pr-10 text-sm"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label={t("list.clearFilters")} className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink">
                  <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div role="tablist" aria-label={t("title")} className="nz-glass flex flex-1 gap-1 overflow-x-auto rounded-2xl p-1 [scrollbar-width:none]! [&::-webkit-scrollbar]:hidden">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${filter === f ? "bg-primary text-white shadow-sm" : "text-ink-muted hover:bg-surface-2 hover:text-ink"}`}
                  >
                    {t(`list.filters.${f}`)}
                    <span className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${filter === f ? "bg-white/20" : "bg-surface-3 text-ink-soft"}`}>{counts[f]}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setNewestFirst((v) => !v)}
                className="nz-glass flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                title={newestFirst ? t("list.sortNewest") : t("list.sortOldest")}
              >
                <ArrowDownUp className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                <span className="hidden sm:inline">{newestFirst ? t("list.sortNewest") : t("list.sortOldest")}</span>
              </button>
            </div>
          </div>

          {/* List */}
          {visible.length === 0 ? (
            <section className="nz-glass mt-4 flex flex-col items-center rounded-3xl px-6 py-12 text-center">
              <Search className="h-8 w-8 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />
              <p className="mt-3 font-semibold text-ink">{t("list.noMatchTitle")}</p>
              <p className="mt-1 text-sm text-ink-muted">{t("list.noMatchText")}</p>
              <Button
                variant="secondary"
                className="mt-5"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                {t("list.clearFilters")}
              </Button>
            </section>
          ) : (
            <div className="mt-4 space-y-6">
              {groups.map((group) => (
                <section key={group.key}>
                  {group.label && <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{group.label}</h2>}
                  <ul className="space-y-4">
                    {group.orders.map((order) => (
                      <li key={order.id}>
                        <OrderCard
                          order={order}
                          displays={displays}
                          locale={locale}
                          reordering={pendingOrderId === order.id}
                          reorderDisabled={pendingOrderId !== null}
                          reorderResult={resultFor(order.id)}
                          onReorder={() => reorder(order)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </AccountLayout>
  );
}

function HeaderStat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: React.ReactNode }) {
  return (
    <div className="border-border/70 px-4 py-3.5 [&:nth-child(n+3)]:border-t sm:[&:nth-child(n+3)]:border-t-0 [&:nth-child(even)]:border-l sm:[&:not(:first-child)]:border-l">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 truncate text-lg font-bold tabular-nums tracking-tight text-ink">{value}</dd>
    </div>
  );
}

function OrderCard({
  order,
  displays,
  locale,
  reordering,
  reorderDisabled,
  reorderResult,
  onReorder,
}: {
  order: Order;
  displays: Record<string, VariantDisplay>;
  locale: string;
  reordering: boolean;
  reorderDisabled: boolean;
  reorderResult: ReturnType<ReturnType<typeof useReorder>["resultFor"]>;
  onReorder: () => void;
}) {
  const t = useTranslations("orders");
  const tNav = useTranslations("navigation");
  const lines = order.lines.filter((l) => l.status === "active");
  const variantIds = lines.map((l) => l.product_variant_id);
  const firstName = variantIds.map((id) => displays[id]?.productName).find(Boolean);
  const step = orderStepIndex(order.status);
  const inFlight = step !== null && step < 4;
  const href = `/orders/${order.order_number}`;

  return (
    <article className="nz-glass group relative overflow-hidden rounded-3xl transition-shadow hover:shadow-[var(--nz-glass-shadow-lg)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href={href} className="truncate font-semibold text-ink hover:text-primary">
            #{order.order_number}
          </Link>
          <span className="text-xs text-ink-soft">{order.placed_at ? formatDate(order.placed_at, locale, "date") : ""}</span>
        </div>
        <Badge tone={STATUS_TONE[order.status] ?? "neutral"}>{t(`status.${order.status}` as "status.draft")}</Badge>
      </header>

      <Link href={href} className="flex items-center gap-4 px-5 py-4">
        <OrderThumbs variantIds={variantIds} displays={displays} />
        <div className="min-w-0 flex-1">
          {firstName && (
            <p className="line-clamp-2 text-sm font-medium text-ink sm:line-clamp-1">
              {firstName}
              {variantIds.length > 1 && <span className="font-normal text-ink-soft"> {t("list.andMore", { count: variantIds.length - 1 })}</span>}
            </p>
          )}
          <p className="mt-0.5 text-xs text-ink-soft">{t("list.itemsCount", { count: orderItemCount(order) })}</p>
          <p className="mt-1 text-base font-bold tabular-nums text-ink sm:hidden">{formatMoney(orderTotal(order), order.currency)}</p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-base font-bold tabular-nums text-ink sm:text-lg">{formatMoney(orderTotal(order), order.currency)}</p>
        </div>
      </Link>

      {inFlight && step !== null && (
        <div className="px-5 pb-4">
          <OrderProgress current={step} />
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-surface-2/30 px-5 py-3">
        {reorderResult ? (
          <p role="alert" className="text-xs font-medium text-warning">
            {reorderResult.kind === "failed" ? (
              t("reorderFailed")
            ) : (
              <>
                {t("reorderPartial", { count: reorderResult.failed })}{" "}
                <Link href="/cart" className="font-semibold text-primary underline">
                  {tNav("cart")}
                </Link>
              </>
            )}
          </p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onReorder} disabled={reorderDisabled || lines.length === 0} className="px-3 py-2">
            {reordering ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />}
            {reordering ? t("reordering") : t("reorder")}
          </Button>
          <Link href={href}>
            <Button type="button" variant="secondary" className="px-3 py-2">
              {t("list.viewDetails")}
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </footer>
    </article>
  );
}
