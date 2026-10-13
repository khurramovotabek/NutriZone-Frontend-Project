"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronRight, LogIn, Minus, Package, Plus, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { OrderCoinEarn } from "@/components/loyalty/ProductCoinReward";
import { useTranslations } from "next-intl";
import type { Cart } from "@/lib/cart-api";
import { getCachedVariantDisplay } from "@/lib/product-display-cache";
import { Button, Card, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import ProductMediaImage from "@/components/ProductMediaImage";
import { emitCartUpdated } from "@/lib/cart-events";
import { priceLine, queueCartTask } from "@/lib/cart-client";
import CartCrossSell from "@/components/cart/CartCrossSell";
import { cartActionNeedsLogin } from "@/lib/cart-errors";

/** The cart itself (client: live quantities, removal, coupon). `emptyRecommendations` is server-rendered by the route and shown under an empty cart. */
export default function CartView({ emptyRecommendations }: { emptyRecommendations?: React.ReactNode }) {
  const t = useTranslations("cart");
  const [cart, setCart] = useState<Cart | null>(null);
  // Guest carts are fully editable; only pricing + checkout need sign-in.
  const [authenticated, setAuthenticated] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [priceRetryFailedId, setPriceRetryFailedId] = useState<string | null>(null);
  const [priceRetryNeedsLoginId, setPriceRetryNeedsLoginId] = useState<string | null>(null);
  // Real, closed gap: an item can be added while signed out (a guest
  // cart), which -- confirmed directly against the backend -- keeps
  // that exact cart usable forever; pricing it only ever needed the
  // *current request* to carry a valid access token, nothing about the
  // cart record itself. A customer who signs in and comes back to their
  // cart previously had to notice the "Narx mavjud emas" state and press
  // "Narxni yangilash" themselves; this closes that gap by trying once,
  // silently, per item, right after the cart loads. Never retried a
  // second time automatically (a real "no price configured" case must
  // never loop) -- the existing manual Retry button still covers that.
  const autoRetriedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cart");
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || !body.success) {
          setError(res.status === 401 ? "login" : (body.error?.message ?? "load"));
          return;
        }
        setCart(body.data);
        setAuthenticated(body.meta?.authenticated !== false);
      } catch {
        if (!cancelled) setError("network");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // A guest can't be priced server-side -- that happens right after
    // sign-in at checkout. Don't fire requests that can only 401.
    if (!cart || !authenticated) return;
    const unpriced = cart.items.filter((i) => i.status !== "removed" && i.price_reference === null && !autoRetriedIds.current.has(i.id));
    if (unpriced.length === 0) return;
    // One line at a time (priceLine is queued): the cart is versioned, so pricing several lines in parallel made all
    // but the first fail with a conflict -- after sign-in the shopper saw "price unavailable, remove and re-add".
    for (const item of unpriced) {
      autoRetriedIds.current.add(item.id);
      priceLine(item.id)
        .then(({ res, body }) => {
          if (res.ok && body?.success && body.data) setCart(body.data as unknown as typeof cart);
        })
        .catch(() => {
          // Silent by design -- the per-item "Narx mavjud emas" / manual
          // Retry state already covers a genuine failure.
        });
    }
  }, [cart, authenticated]);

  async function updateQuantity(lineId: string, quantity: number) {
    setPendingLineId(lineId);
    try {
      const res = await queueCartTask(() => fetch(`/api/cart/items/${lineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      }));
      const body = await res.json();
      if (res.ok && body.success) setCart(body.data);
      else setError(body.error?.message ?? "update");
    } finally {
      setPendingLineId(null);
    }
  }

  async function retryPrice(lineId: string) {
    setPendingLineId(lineId);
    setPriceRetryFailedId(null);
    setPriceRetryNeedsLoginId(null);
    try {
      const { res, body } = await priceLine(lineId);
      // A failed retry stays scoped to this one line -- it must never
      // blow away the whole cart view (a real, common state, not a rare
      // edge case) the way the full-page ErrorState below does for
      // update/remove failures.
      if (res.ok && body.success && body.data) setCart(body.data as unknown as typeof cart);
      // A guest's retry can never succeed no matter how many times they
      // press it -- distinguished here so they see "sign in" instead of
      // an endless, misleading "try again".
      else if (cartActionNeedsLogin(body.error?.code)) setPriceRetryNeedsLoginId(lineId);
      else setPriceRetryFailedId(lineId);
    } catch {
      setPriceRetryFailedId(lineId);
    } finally {
      setPendingLineId(null);
    }
  }

  async function removeItem(lineId: string) {
    setPendingLineId(lineId);
    try {
      const res = await queueCartTask(() => fetch(`/api/cart/items/${lineId}`, { method: "DELETE" }));
      const body = await res.json();
      if (res.ok && body.success) {
        setCart(body.data);
        emitCartUpdated();
      } else {
        setError(body.error?.message ?? "remove");
      }
    } finally {
      setPendingLineId(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    const knownMessages: Record<string, string> = { login: t("loginPrompt"), network: t("networkError") };
    const message = knownMessages[error] ?? (error === "update" ? t("updateError") : error === "remove" ? t("removeError") : t("loadError"));
    return (
      <ErrorState
        message={message}
        action={
          error === "login" && (
            <Link href="/login?next=/cart">
              <Button variant="primary">{t("goToLogin")}</Button>
            </Link>
          )
        }
      />
    );
  }

  const activeItems = cart?.items.filter((i) => i.status !== "removed") ?? [];

  if (activeItems.length === 0) {
    return (
      <>
      <EmptyState
        icon={<ShoppingCart className="h-16 w-16" strokeWidth={1.25} aria-hidden="true" />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <Link href="/products">
            <Button variant="primary">{t("continueShopping")}</Button>
          </Link>
        }
      />
      {emptyRecommendations}
      </>
    );
  }

  const pricedItems = activeItems.filter((i) => i.price_reference !== null);
  const currency = pricedItems[0]?.price_reference?.currency;
  const allSameCurrency = pricedItems.length > 0 && pricedItems.every((i) => i.price_reference!.currency === currency);
  const total = allSameCurrency ? pricedItems.reduce((acc, i) => acc + Number(i.price_reference!.unit_amount) * i.quantity, 0) : null;

  // Guest estimate: the catalog price the shopper saw (display cache) for
  // lines the server hasn't priced yet. Clearly labelled as an estimate;
  // the real total is computed server-side after sign-in at checkout.
  const estimateLines = activeItems.map((i) => {
    if (i.price_reference) return { amount: Number(i.price_reference.unit_amount) * i.quantity, currency: i.price_reference.currency };
    const cached = getCachedVariantDisplay(i.product_variant_id);
    const unit = cached?.displayPrice ? Number(cached.displayPrice) : NaN;
    return Number.isNaN(unit) || !cached?.displayCurrency ? null : { amount: unit * i.quantity, currency: cached.displayCurrency };
  });
  const estimateCurrency = estimateLines.find((l) => l)?.currency;
  const estimateComplete = estimateLines.every((l) => l && l.currency === estimateCurrency);
  const estimatedTotal = !authenticated && estimateComplete ? estimateLines.reduce((acc, l) => acc + (l?.amount ?? 0), 0) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label={t("breadcrumbLabel")} className="mb-4 flex items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/products" className="transition-colors hover:text-primary">
          {t("breadcrumbCatalog")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-ink-muted">{t("title")}</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {t("title")} <span className="text-base font-normal text-ink-muted">{t("itemCount", { count: activeItems.length })}</span>
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-4">
          {activeItems.map((item) => {
            const priced = item.price_reference !== null;
            const lineTotal = priced ? formatAmount(Number(item.price_reference!.unit_amount) * item.quantity) : null;
            // Real, opportunistic enrichment (see product-display-cache.ts):
            // the Cart API itself never returns name/image/SKU, only
            // product_variant_id -- this was cached client-side the moment
            // this shopper actually saw the product (catalog card or detail
            // page). A cache miss (e.g. cart opened on a different device)
            // still falls back to the generic icon + short id, never a
            // fabricated name.
            const cached = getCachedVariantDisplay(item.product_variant_id);
            return (
              <li key={item.id}>
                <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    <ProductMediaImage
                      src={cached?.image ?? null}
                      size="small"
                      alt={cached?.productName ?? t("variant", { id: item.product_variant_id.slice(0, 8) })}
                      fit="contain"
                      padding="p-2"
                      fallbackIcon={<Package className="h-8 w-8 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />}
                    />
                  </div>

                  <div className="flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-ink">{cached?.productName ?? t("variant", { id: item.product_variant_id.slice(0, 8) })}</p>
                    {cached?.variantLabel && <p className="text-xs text-ink-soft">{cached.variantLabel}</p>}
                    {priced ? (
                      <p className="mt-1 text-sm text-ink-muted">
                        {formatAmount(Number(item.price_reference!.unit_amount))} {item.price_reference!.currency} {t("each")}
                        {item.quantity > 1 && (
                          <span className="ml-2 text-ink-soft">
                            &middot; {lineTotal} {item.price_reference!.currency} {t("total")}
                          </span>
                        )}
                      </p>
                    ) : !authenticated ? (
                      <p className="mt-1 text-sm text-ink-muted">
                        {cached?.displayPrice && cached.displayCurrency ? (
                          <>
                            {formatAmount(Number(cached.displayPrice))} {cached.displayCurrency} {t("each")}
                            <span className="ml-2 text-xs text-ink-soft">&middot; {t("guestPriceNote")}</span>
                          </>
                        ) : (
                          <span className="text-xs text-ink-soft">{t("guestPriceNote")}</span>
                        )}
                      </p>
                    ) : (
                      <div className="mt-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-amber-600 dark:text-amber-400">{t("priceUnavailable")}</p>
                          <button
                            type="button"
                            onClick={() => retryPrice(item.id)}
                            disabled={pendingLineId === item.id}
                            className="text-xs font-medium text-primary underline hover:no-underline disabled:opacity-50"
                          >
                            {pendingLineId === item.id ? t("priceRetrying") : t("priceRetry")}
                          </button>
                        </div>
                        {priceRetryFailedId === item.id && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t("priceRetryFailed")}</p>}
                        {priceRetryNeedsLoginId === item.id && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            {t("priceRetryNeedsLogin")}{" "}
                            <Link href="/login?next=/cart" className="font-medium text-primary underline hover:no-underline">
                              {t("goToLogin")}
                            </Link>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="nz-glass flex items-center gap-1 rounded-xl p-1">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        disabled={pendingLineId === item.id || item.quantity <= 1}
                        aria-label={t("decrease")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-all hover:text-primary disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                      </button>
                      <span aria-live="polite" className="w-6 text-center font-medium text-ink">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={pendingLineId === item.id}
                        aria-label={t("increase")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-all hover:text-primary disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={pendingLineId === item.id}
                      aria-label={t("remove")}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>

        <div className="lg:sticky lg:top-6 lg:h-fit">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink-muted">{t("orderSummary")}</h2>
            {!authenticated ? (
              <>
                {estimatedTotal !== null && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-semibold text-ink">{t("estimatedTotal")}</span>
                    <span className="text-xl font-bold text-primary">
                      {formatAmount(estimatedTotal)} {estimateCurrency}
                    </span>
                  </div>
                )}
                <div className="mt-3 flex gap-2.5 rounded-xl border border-primary/20 bg-primary-soft p-3 text-xs text-ink-muted">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
                  <p>{t("guestCheckoutNote")}</p>
                </div>
              </>
            ) : total !== null ? (
              <>
                <div className="flex justify-between border-b border-border pb-3 text-sm text-ink-muted">
                  <span>{t("subtotalLabel", { priced: pricedItems.length, total: activeItems.reduce((n, i) => n + i.quantity, 0) })}</span>
                  <span className="tabular-nums text-ink">
                    {formatAmount(total)} {currency}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-base font-semibold text-ink">{t("totalLabel")}</span>
                  <span className="text-xl font-bold text-primary">
                    {formatAmount(total)} {currency}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400">{t("priceUnavailable")}</p>
            )}
            {authenticated && total !== null && <OrderCoinEarn amount={total} currency={currency} />}
            {!authenticated && estimatedTotal !== null && <OrderCoinEarn amount={estimatedTotal} currency={estimateCurrency} />}
            {authenticated && <p className="mt-3 text-xs text-ink-soft">{t("subtotalNote")}</p>}

            <Link href={authenticated ? "/checkout" : "/login?next=/checkout"} className="mt-5 block">
              <Button variant="primary" className="w-full">
                {authenticated ? (
                  <>
                    {t("proceedToCheckout")}
                    <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    {t("signInToCheckout")}
                  </>
                )}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
      <CartCrossSell variantIds={activeItems.map((i) => i.product_variant_id)} />
    </div>
  );
}

function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString("en-US");
}
