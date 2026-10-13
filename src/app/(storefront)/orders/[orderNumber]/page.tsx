"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Copy, LifeBuoy, LoaderCircle, MapPin, Package, PartyPopper, Phone, RotateCcw, ShoppingBag, User, Store as StoreIcon, Clock, Landmark } from "lucide-react";
import Link from "next/link";
import MapLinks from "@/components/MapLinks";
import { useLocale, useTranslations } from "next-intl";
import type { Order, OrderLine } from "@/lib/orders-api";
import PaymentStatusCard from "@/components/PaymentStatusCard";
import ProductMediaImage from "@/components/ProductMediaImage";
import { Badge, ErrorState, Button, Skeleton } from "@/components/ui";
import AccountLayout from "@/components/AccountLayout";
import OrderProgress from "@/components/orders/OrderProgress";
import OrderAfterSales from "@/components/orders/OrderAfterSales";
import OrderPayPanel from "@/components/orders/OrderPayPanel";
import type { OrderPaymentState } from "@/lib/payments-api";

const PAY_NAMES: Record<string, string> = { payme: "Payme", click: "Click", uzum: "Uzum Bank", uzcard: "Uzcard", humo: "Humo" };
import { STATUS_TONE, isStopped, orderStepIndex } from "@/components/orders/order-status";
import { useReorder } from "@/components/orders/useReorder";
import { formatMoney, orderItemCount } from "@/lib/account-insights";
import { formatDate } from "@/lib/dates";
import { useVariantDisplays, type VariantDisplay } from "@/lib/variant-display";

function OrderLineRow({ line, display }: { line: OrderLine; display: VariantDisplay | undefined }) {
  const t = useTranslations("orders.detail");
  const unit = Number(line.unit_price.amount);
  const discount = Number(line.discount_amount.amount);
  const name = display?.productName || t("variant", { id: line.product_variant_id.slice(0, 8), qty: line.quantity });
  const productHref = display?.linkable && display.productSlug ? `/products/${display.productSlug}` : null;

  return (
    <li className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-surface-2 sm:h-20 sm:w-20">
        <ProductMediaImage
          src={display?.image ?? null}
          size="small"
          alt={name}
          fit="contain"
          padding="p-2"
          fallbackIcon={<Package className="h-6 w-6 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />}
        />
      </div>
      <div className="min-w-0 flex-1">
        {display?.brandName && <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{display.brandName}</p>}
        {productHref ? (
          <Link href={productHref} className="line-clamp-2 text-sm font-semibold text-ink transition-colors hover:text-primary">
            {name}
          </Link>
        ) : (
          <p className="line-clamp-2 text-sm font-semibold text-ink">{name}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
          {display?.variantLabel && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-medium text-ink-muted">{display.variantLabel}</span>}
          <span className="tabular-nums">{t("unitTimes", { qty: line.quantity, price: formatMoney(unit, line.unit_price.currency) })}</span>
          {display && !display.linkable && <span className="text-warning">{t("unavailable")}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums text-ink">{formatMoney(Number(line.line_total.amount), line.line_total.currency)}</p>
        {discount > 0 && <p className="text-xs tabular-nums text-ink-soft line-through">{formatMoney(unit * line.quantity, line.unit_price.currency)}</p>}
      </div>
    </li>
  );
}

const TERMINAL_STATUSES = new Set(["confirmed", "processing", "shipped", "delivered", "completed", "cancelled", "returned", "failed"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

export default function OrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const searchParams = useSearchParams();
  const isFreshSuccess = searchParams.get("success") === "1";
  const t = useTranslations("orders.detail");
  const tOrders = useTranslations("orders");
  const tNav = useTranslations("navigation");
  const tPayment = useTranslations("payment");
  const [payInfo, setPayInfo] = useState<OrderPaymentState | null>(null);
  const paidVia = payInfo?.paid && payInfo.latest?.status === "succeeded" ? payInfo.latest.method : null;
  const locale = useLocale();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { reorder, pendingOrderId, resultFor } = useReorder();

  const activeLines = order ? order.lines.filter((l) => l.status === "active") : [];
  const displays = useVariantDisplays(
    activeLines.map((l) => l.product_variant_id),
    locale,
  );

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/orders/${params.orderNumber}`);
      const body = await res.json();
      if (!res.ok || !body.success) {
        if (res.status === 401) setErrorKey("login");
        else if (res.status === 403) setErrorKey("forbidden");
        else if (res.status === 404) setErrorKey("notFound");
        else setErrorKey("load");
        return null;
      }
      setOrder(body.data);
      setErrorKey(null);
      return body.data as Order;
    } catch {
      setErrorKey("connection");
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      const data = await fetchOrder();
      setLoading(false);
      if (data && !TERMINAL_STATUSES.has(data.status)) {
        schedulePoll();
      }
    }

    function schedulePoll() {
      if (cancelled || attemptsRef.current >= MAX_POLL_ATTEMPTS) return;
      timerRef.current = setTimeout(async () => {
        if (cancelled) return;
        attemptsRef.current += 1;
        const data = await fetchOrder();
        if (!cancelled && data && !TERMINAL_STATUSES.has(data.status)) {
          schedulePoll();
        }
      }, POLL_INTERVAL_MS);
    }

    initialLoad();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.orderNumber]);

  async function copyNumber(number: string) {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked -- nothing to do; the number is visible on screen.
    }
  }

  if (loading) {
    return (
      <AccountLayout>
        <Skeleton className="mb-4 h-4 w-48" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-80 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </AccountLayout>
    );
  }

  if (errorKey) {
    const messages: Record<string, string> = { login: t("loginPrompt"), forbidden: t("forbidden"), notFound: t("notFound"), connection: t("connectionError") };
    return (
      <ErrorState
        message={messages[errorKey] ?? t("loadError")}
        action={
          <>
            {errorKey === "login" && (
              <Link href={`/login?next=/orders/${params.orderNumber}`}>
                <Button variant="primary">{t("goToLogin")}</Button>
              </Link>
            )}
            <Link href="/orders" className="mt-4 block text-sm text-primary transition-colors hover:brightness-110">
              {t("backToOrders")}
            </Link>
          </>
        }
      />
    );
  }

  if (!order) return null;

  const subtotal = activeLines.reduce((acc, l) => acc + Number(l.unit_price.amount) * l.quantity, 0);
  const discount = activeLines.reduce((acc, l) => acc + Number(l.discount_amount.amount), 0);
  const total = activeLines.reduce((acc, l) => acc + Number(l.line_total.amount), 0);
  const step = orderStepIndex(order.status);
  const stopped = isStopped(order.status);
  const address = order.shipping_address;
  const pickup = order.fulfilment_method === "pickup";
  const store = order.pickup_store ?? null;
  const reorderResult = resultFor(order.id);
  const placed = order.placed_at ? new Date(order.placed_at) : null;

  return (
    <AccountLayout>
      <nav aria-label={t("breadcrumbLabel")} className="mb-4 flex items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/orders" className="transition-colors hover:text-primary">
          {t("breadcrumbOrders")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-ink-muted">{order.order_number}</span>
      </nav>

      {isFreshSuccess && (
        <section className="nz-rise relative mb-6 overflow-hidden rounded-3xl bg-[linear-gradient(140deg,color-mix(in_srgb,var(--nz-success)_88%,black),color-mix(in_srgb,var(--nz-primary)_80%,black))] p-6 text-center text-white shadow-[0_24px_48px_-24px_rgba(14,159,95,0.7)]">
          <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <PartyPopper className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h2 className="relative mt-3 text-lg font-bold">{t("successTitle")}</h2>
          <p className="relative mt-1 text-sm text-white/85">{t("successSubtitle", { number: order.order_number })}</p>
          <Link href="/products" className="relative mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[var(--nz-success)] transition-transform hover:-translate-y-0.5">
            <ShoppingBag className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            {t("continueShopping")}
          </Link>
        </section>
      )}

      {/* Header */}
      <section className="nz-glass relative overflow-hidden rounded-3xl">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className={`absolute inset-0 ${stopped ? "bg-[radial-gradient(110%_90%_at_0%_0%,color-mix(in_srgb,var(--nz-danger)_14%,transparent),transparent_60%)]" : "bg-[radial-gradient(110%_90%_at_0%_0%,rgba(var(--nz-primary-rgb),0.18),transparent_60%)]"}`} />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--nz-primary-rgb),0.5)] to-transparent" />
        </div>
        <div className="relative p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">#{order.order_number}</h1>
                <button
                  type="button"
                  onClick={() => copyNumber(order.order_number)}
                  aria-label={t("copy")}
                  title={t("copy")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  {copied ? <Check className="h-4 w-4 text-success" strokeWidth={2.25} aria-hidden="true" /> : <Copy className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />}
                </button>
                {copied && <span className="text-xs font-medium text-success">{t("copied")}</span>}
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {placed && `${formatDate(placed, locale, "long")}, ${placed.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                <span className="mx-1.5 text-ink-soft">·</span>
                {t("itemCount", { count: orderItemCount(order) })}
              </p>
            </div>
            <div className="text-right">
              <Badge tone={STATUS_TONE[order.status] ?? "neutral"}>
                {pickup && order.status === "shipped" ? tOrders("status.readyForPickup") : pickup && order.status === "delivered" ? tOrders("status.pickedUp") : tOrders(`status.${order.status}` as "status.draft")}
              </Badge>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-ink">{formatMoney(total, order.currency)}</p>
            </div>
          </div>

          {step !== null && (
            <div className="mt-6 rounded-2xl border border-border/70 bg-surface/55 p-4 backdrop-blur-sm sm:p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("progressTitle")}</p>
              <OrderProgress current={step} showLabels className="hidden sm:flex" pickup={pickup} />
              <OrderProgress current={step} className="sm:hidden" pickup={pickup} />
            </div>
          )}
          {stopped && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/8 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" strokeWidth={1.9} aria-hidden="true" />
              <div>
                <p className="font-semibold text-ink">{t(`stoppedTitle.${order.status as "cancelled"}`)}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{t("stoppedText")}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Items */}
          <section className="nz-glass overflow-hidden rounded-3xl">
            <header className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <Package className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden="true" />
                {t("items")}
              </h2>
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-ink-muted">{activeLines.length}</span>
            </header>
            <ul className="divide-y divide-border/70 px-5 py-4">
              {activeLines.map((line) => (
                <OrderLineRow key={line.id} line={line} display={displays[line.product_variant_id]} />
              ))}
            </ul>
          </section>

          {/* The stopped banner above already explains a cancelled/failed/returned order. */}
          {!stopped && <OrderPayPanel orderNumber={order.order_number} onPaid={fetchOrder} onState={setPayInfo} />}
          {!stopped && <PaymentStatusCard order={order} className="rounded-3xl p-5" />}

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/orders" className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:brightness-110">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {t("backToOrders")}
            </Link>
          </div>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24">
          {/* Summary */}
          <section className="nz-glass rounded-3xl p-5">
            <h2 className="text-sm font-semibold text-ink">{t("orderSummary")}</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t("subtotal")}</dt>
                <dd className="tabular-nums text-ink">{formatMoney(subtotal, order.currency)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t("discount")}</dt>
                  <dd className="tabular-nums text-success">−{formatMoney(discount, order.currency)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 border-t border-border/70 pt-3">
                <dt className="font-semibold text-ink">{t("total")}</dt>
                <dd className="text-xl font-bold tabular-nums text-primary">{formatMoney(total, order.currency)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2/60 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
              <img src={`/payments/${paidVia ?? "cash"}.svg`} alt="" className="h-9 w-[54px] shrink-0 rounded-lg shadow-sm" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">{t("paymentMethod")}</p>
                <p className="text-sm font-medium text-ink">{paidVia ? `${PAY_NAMES[paidVia] ?? paidVia} · ${tPayment("successTitle")}` : pickup ? t("paymentAtStore") : t("paymentCash")}</p>
              </div>
            </div>
            <Button type="button" variant="primary" className="mt-4 w-full" onClick={() => reorder(order)} disabled={pendingOrderId !== null || activeLines.length === 0}>
              {pendingOrderId === order.id ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />}
              {pendingOrderId === order.id ? tOrders("reordering") : tOrders("reorder")}
            </Button>
            {reorderResult && (
              <p role="alert" className="mt-2 text-xs font-medium text-warning">
                {reorderResult.kind === "failed" ? (
                  tOrders("reorderFailed")
                ) : (
                  <>
                    {tOrders("reorderPartial", { count: reorderResult.failed })}{" "}
                    <Link href="/cart" className="font-semibold text-primary underline">
                      {tNav("cart")}
                    </Link>
                  </>
                )}
              </p>
            )}
          </section>

          {/* Pickup branch */}
          {pickup && store && (
            <section className="nz-glass rounded-3xl p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <StoreIcon className="h-4 w-4 text-orange-500" strokeWidth={1.9} aria-hidden="true" />
                {t("pickupAt")}
              </h2>
              <div className="mt-3 space-y-2 text-sm">
                <Link href={`/store/${store.slug}`} className="font-semibold text-ink hover:text-primary">{store.name}</Link>
                {store.address && <p className="flex items-start gap-2 text-ink-muted"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden="true" />{store.address}</p>}
                {store.landmark && <p className="flex items-start gap-2 text-ink-muted"><Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden="true" />{store.landmark}</p>}
                <p className={`flex items-center gap-2 ${store.is_open_now ? "text-emerald-600 dark:text-emerald-400" : "text-ink-soft"}`}>
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {store.is_open_now ? t("storeOpenNow") : t("storeClosedNow")}{store.today ? ` · ${store.today}` : ""}
                </p>
                {store.phone && <a href={`tel:${store.phone}`} className="flex items-center gap-2 font-medium text-primary"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{store.phone}</a>}
                {order.status === "shipped" && (
                  <p className="rounded-xl bg-emerald-500/12 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">{t("pickupReadyNote", { number: order.order_number })}{store.note ? ` ${store.note}` : ""}</p>
                )}
                {store.latitude != null && store.longitude != null && <MapLinks latitude={store.latitude} longitude={store.longitude} label={store.name} compact />}
              </div>
            </section>
          )}

          {/* Address */}
          {address && !pickup && (
            <section className="nz-glass rounded-3xl p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <MapPin className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden="true" />
                {t("deliveryAddress")}
              </h2>
              <div className="mt-3 space-y-2 text-sm">
                <p className="font-medium text-ink">{[address.line1, address.line2].filter(Boolean).join(", ")}</p>
                <p className="text-ink-muted">{[address.city, address.region].filter(Boolean).join(", ")}</p>
                <div className="space-y-1.5 border-t border-border/70 pt-2.5">
                  {address.recipient_name && (
                    <p className="flex items-center gap-2 text-ink-muted">
                      <User className="h-3.5 w-3.5 text-ink-soft" strokeWidth={1.9} aria-hidden="true" />
                      {address.recipient_name}
                    </p>
                  )}
                  {address.phone && (
                    <p className="flex items-center gap-2 text-ink-muted">
                      <Phone className="h-3.5 w-3.5 text-ink-soft" strokeWidth={1.9} aria-hidden="true" />
                      {address.phone}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Cancel / return */}
          <OrderAfterSales order={order} displays={displays} onChanged={fetchOrder} />

          {/* Help */}
          <section className="rounded-3xl border border-border/70 bg-surface-2/40 p-5">
            <LifeBuoy className="h-6 w-6 text-primary" strokeWidth={1.6} aria-hidden="true" />
            <p className="mt-2 font-semibold text-ink">{t("needHelpTitle")}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{t("needHelpText")}</p>
            <Link href="/account/chat" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              {t("contactSupport")}
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </div>
    </AccountLayout>
  );
}
