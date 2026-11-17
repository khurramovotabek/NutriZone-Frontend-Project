"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Gift, LoaderCircle, LogIn, MessageSquarePlus, ShieldCheck, ShoppingCart, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CheckoutPreview } from "@/lib/cart-api";
import type { Address } from "@/lib/geo-api";
import { emitCartUpdated } from "@/lib/cart-events";
import { localDigits, parseUzPhone } from "@/lib/phone";
import { Button, Card, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import AddressSelector from "@/components/checkout/AddressSelector";
import AddressForm, { type AddressDraft, type AddressPlace } from "@/components/AddressForm";
import PaymentMethodCard, { withinLimits } from "@/components/checkout/PaymentMethodCard";
import type { PaymentMethod, PaymentMethodKey } from "@/lib/payments-api";
import OrderSummary, { DeliveryLine, deliveryFeeOf } from "@/components/checkout/OrderSummary";
import { formatPrice } from "@/components/PriceTag";
import CoinRedeemCard from "@/components/checkout/CoinRedeemCard";
import FulfilmentPicker, { type PickupOption } from "@/components/checkout/FulfilmentPicker";
import PhoneField from "@/components/checkout/PhoneField";

const COIN_ERROR_CODES = new Set(["INSUFFICIENT_COINS", "REDEEM_ABOVE_LIMIT", "REDEEM_BELOW_MINIMUM", "REDEEM_DISABLED"]);
const INPUT = "nz-glass-input w-full rounded-xl px-3.5 py-3 text-[16px]";

type Profile = { full_name: string; phone_number: string };

/**
 * One-page checkout: what's in the order, how to receive it, who to call, where to bring it, how to pay -- and one
 * button. Works signed in (saved addresses, coins, coupons) and as a guest: a name + a phone typed in any format +
 * a map point; the order is placed by /api/checkout/guest (a new number gets a guest account, coins are for
 * signing up). No footer or chat bubbles here (HideOnFocusRoutes) -- nothing between the shopper and "Buyurtma berish".
 */
export default function CheckoutPage() {
  const router = useRouter();
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const locale = useLocale();

  const [guest, setGuest] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [pickupStore, setPickupStore] = useState<PickupOption | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [place, setPlace] = useState<AddressPlace | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(""); // 9 local digits
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [coinsToRedeem, setCoinsToRedeem] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("cash");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const addressSaveRef = useRef<(() => Promise<Address | null>) | null>(null);
  const draftRef = useRef<(() => AddressDraft | null) | null>(null);
  const contactRef = useRef<HTMLDivElement | null>(null);
  const addressRef = useRef<HTMLDivElement | null>(null);

  // ------------------------------------------------------------------ loading
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cartBody, methodsBody] = await Promise.all([
          fetch("/api/cart").then((r) => r.json()),
          fetch("/api/payments/methods").then((r) => r.json()).catch(() => null),
        ]);
        if (cancelled) return;
        if (methodsBody?.success && Array.isArray(methodsBody.data)) setPaymentMethods(methodsBody.data);
        const signedIn = !!cartBody?.meta?.authenticated;
        setGuest(!signedIn);
        if (!signedIn) return; // the guest preview loads below (it follows the map point)
        const [addressesBody, profileBody] = await Promise.all([
          fetch("/api/addresses").then((r) => r.json()),
          fetch("/api/profile").then((r) => r.json()),
        ]);
        if (cancelled) return;
        const list: Address[] = addressesBody.success ? addressesBody.data : [];
        setAddresses(list);
        const owner: Profile | null = profileBody.success ? { full_name: profileBody.data.full_name ?? "", phone_number: profileBody.data.phone_number ?? "" } : null;
        const preferred = list.find((a) => a.is_default) ?? list[0];
        if (preferred) setSelectedAddressId(preferred.id);
        setName((preferred?.recipient_name || owner?.full_name || "").trim());
        setPhone(localDigits(preferred?.recipient_phone || owner?.phone_number || ""));
      } catch {
        if (!cancelled) setLoadError("network");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // the summary follows the receiving method and the place: signed in -> the saved address, guest -> the map point
  const previewUrl = guest === null
    ? null
    : guest
      ? `/api/checkout/guest-preview?method=${fulfilment}${fulfilment === "delivery" && place ? `&city_id=${place.cityId}&region_id=${place.regionId}${place.lat != null ? `&lat=${place.lat}&lng=${place.lng}` : ""}` : ""}`
      : `/api/checkout/preview?method=${fulfilment}${fulfilment === "delivery" && selectedAddressId ? `&address_id=${encodeURIComponent(selectedAddressId)}` : ""}`;

  const refreshPreview = useCallback(async () => {
    if (!previewUrl) return;
    const body = await fetch(previewUrl).then((r) => r.json()).catch(() => null);
    if (body?.success) setPreview(body.data);
    else if (!preview) setLoadError(body?.error?.code === "NO_SESSION" ? "login" : "load");
  }, [previewUrl, preview]);

  useEffect(() => {
    if (!previewUrl) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(previewUrl)
        .then((r) => r.json())
        .then((body) => {
          if (cancelled) return;
          if (body.success) setPreview(body.data);
          else setLoadError((prev) => prev ?? (body.error?.code === "NO_SESSION" ? "login" : "load"));
        })
        .catch(() => !cancelled && setLoadError((prev) => prev ?? "network"));
    }, preview ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  // ------------------------------------------------------------------ helpers
  const fullPhone = parseUzPhone(phone);
  const nameOk = name.trim().length >= 2;

  function fail(message: string, el?: HTMLElement | null) {
    setError(message);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clientValid(): boolean {
    setTouched(true);
    if (fulfilment === "pickup" && !pickupStore) return (fail(t("fulfilment.chooseStoreError"), addressRef.current), false);
    if (!nameOk) return (fail(t("validation.firstNameRequired"), contactRef.current), false);
    if (!fullPhone) return (fail(t("fast.phoneInvalid"), contactRef.current), false);
    return true;
  }

  async function payOrGo(orderNumber: string, signedIn: boolean, checkoutUrl?: string | null) {
    const chosen = paymentMethods.find((m) => m.key === effectiveMethod);
    if (checkoutUrl) {
      setRedirecting(true);
      window.location.assign(checkoutUrl);
      return;
    }
    if (signedIn && chosen?.online && chosen.available && withinLimits(chosen, payableAmount)) {
      setRedirecting(true);
      const payBody = await fetch(`/api/payments/orders/${encodeURIComponent(orderNumber)}/pay`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: chosen.key, lang: locale }),
      }).then((r) => r.json()).catch(() => null);
      if (payBody?.success && payBody.data?.checkout_url) {
        window.location.assign(payBody.data.checkout_url);
        return;
      }
      setRedirecting(false);
      router.push(`/orders/${orderNumber}?success=1&payment=failed`);
      return;
    }
    router.push(signedIn ? `/orders/${orderNumber}?success=1` : `/checkout/success?n=${encodeURIComponent(orderNumber)}`);
  }

  // ------------------------------------------------------------------ guest order
  async function placeGuestOrder() {
    let draft: AddressDraft | null = null;
    if (fulfilment === "delivery") {
      draft = draftRef.current?.() ?? null;
      if (!draft) return fail(t("fast.addressIncomplete"), addressRef.current);
    }
    const res = await fetch("/api/checkout/guest", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: name.trim(), phone: fullPhone, fulfilmentMethod: fulfilment, pickupStoreId: pickupStore?.id, comment: comment.trim(), paymentMethod: effectiveMethod,
        address: draft && {
          countryId: draft.countryId, regionId: draft.regionId, cityId: draft.cityId, districtId: draft.districtId, line1: draft.line1, metadata: draft.metadata,
          latitude: draft.latitude, longitude: draft.longitude, source: draft.source, accuracy: draft.accuracy,
        },
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      if (body?.error?.code === "CART_OUT_OF_STOCK" || body?.error?.code === "PICKUP_STORE_OUT_OF_STOCK") await refreshPreview();
      return fail(body?.error?.code === "CART_OUT_OF_STOCK" ? tCart("shortageBlock") : body?.error?.message ?? t("checkoutError"));
    }
    emitCartUpdated();
    try {
      sessionStorage.setItem(`nz-order-${body.data.order_number}`, JSON.stringify({ ...body.data, name: name.trim(), phone: fullPhone, method: effectiveMethod, fulfilment }));
    } catch {
      /* the success page still shows the number */
    }
    await payOrGo(body.data.order_number, body.data.signed_in, body.data.checkout_url);
  }

  // ------------------------------------------------------------------ signed-in order
  async function placeAccountOrder() {
    let addressId = selectedAddressId;
    if (fulfilment === "delivery" && addressSaveRef.current) {
      const saved = await addressSaveRef.current();
      if (saved) {
        addressId = saved.id;
        setAddresses((prev) => (prev.some((a) => a.id === saved.id) ? prev : [...prev, saved]));
        setSelectedAddressId(saved.id);
      } else if (!addressId) return fail(t("validation.addressIncomplete"), addressRef.current);
    }
    if (fulfilment === "delivery" && !addressId) return fail(t("validation.addressRequired"), addressRef.current);

    if (fulfilment === "delivery" && addressId) {
      // who to call goes onto the chosen address (it is what the courier sees)
      const current = addresses.find((a) => a.id === addressId);
      if (!current || (current.recipient_name ?? "").trim() !== name.trim() || localDigits(current.recipient_phone ?? "") !== phone) {
        const r = await fetch(`/api/addresses/${addressId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientName: name.trim(), recipientPhone: fullPhone }),
        }).then((x) => x.json()).catch(() => null);
        if (!r?.success) return fail(t("addressError"));
      }
    }
    if (comment.trim()) {
      await fetch("/api/cart", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: comment.trim() }) }).catch(() => {});
    }
    const res = await fetch("/api/checkout/submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shippingAddressId: addressId ?? "", fulfilmentMethod: fulfilment, pickupStoreId: fulfilment === "pickup" ? pickupStore?.id : undefined, coinsToRedeem: effectiveCoins }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      const coinError = COIN_ERROR_CODES.has(body?.error?.code) ? t(`coins.errors.${body.error.code}`) : null;
      if (coinError) setCoinsToRedeem(0);
      if (coinError || body?.error?.code === "CART_OUT_OF_STOCK" || body?.error?.code === "PICKUP_STORE_OUT_OF_STOCK") await refreshPreview();
      return fail(coinError ?? (body?.error?.code === "CART_OUT_OF_STOCK" ? tCart("shortageBlock") : body?.error?.message) ?? t("checkoutError"));
    }
    await fetch("/api/cart/clear", { method: "POST" }).then((r) => (r.ok ? emitCartUpdated() : undefined)).catch(() => {});
    await payOrGo(body.data.order_number, true);
  }

  async function handlePlaceOrder() {
    if (submitting || redirecting) return;
    setError(null);
    if (!clientValid()) return;
    setSubmitting(true);
    try {
      if (guest) await placeGuestOrder();
      else await placeAccountOrder();
    } catch {
      setError(t("networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------------ states
  if (loadError) {
    const message = loadError === "network" ? t("networkError") : t("loadError");
    return <ErrorState message={message} action={<Link href="/cart"><Button variant="primary">{t("backToCart")}</Button></Link>} />;
  }
  if (guest === null || !preview) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Skeleton className="mb-5 h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-72 w-full" /><Skeleton className="h-32 w-full" /></div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  if (preview.issues.some((issue) => issue.code === "empty_cart")) {
    return (
      <EmptyState
        icon={<ShoppingCart strokeWidth={1.5} aria-hidden="true" />} title={tCart("emptyTitle")} description={tCart("emptyDescription")}
        action={<Link href="/products"><Button variant="primary">{tCart("continueShopping")}</Button></Link>}
      />
    );
  }

  const effectiveCoins = !guest && preview.loyalty ? Math.min(coinsToRedeem, preview.loyalty.max_redeemable) : 0;
  const payableAmount = preview.total ? Math.max(0, Number(preview.total.amount) - effectiveCoins) + deliveryFeeOf(preview, fulfilment === "pickup") : null;
  const picked = paymentMethods.find((m) => m.key === paymentMethod);
  const effectiveMethod: PaymentMethodKey = picked && picked.available && withinLimits(picked, payableAmount) ? paymentMethod : "cash";
  const outOfStock = (preview.stock_shortages?.length ?? 0) > 0;
  const blocked = outOfStock || preview.readiness === "blocked";
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;
  const busy = submitting || redirecting;
  const itemCount = preview.items.filter((i) => i.status !== "removed").reduce((n, i) => n + i.quantity, 0);
  const cta = redirecting ? t("pay.redirecting") : submitting ? t("submitting") : paymentMethods.find((m) => m.key === effectiveMethod)?.online ? t("pay.placeAndPay") : t("fast.placeOrder");

  const confirmButton = (
    <Button onClick={handlePlaceOrder} disabled={busy || blocked} variant="primary" className="w-full py-3.5 text-base">
      {busy && <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />}
      {cta}
    </Button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pb-36 pt-4 sm:pt-6 lg:pb-12">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/cart" aria-label={t("backToCart")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink transition-colors hover:text-primary">
          <ArrowLeft className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{t("title")}</h1>
          <p className="text-xs text-ink-soft">{t("fast.subtitle", { count: itemCount })}</p>
        </div>
      </div>

      {(guest || preview?.guest_account) && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/15 to-amber-300/5 px-3.5 py-3">
          <Gift className="h-5 w-5 shrink-0 text-amber-500" strokeWidth={2} aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink">{t("fast.guestBanner")}</p>
          <Link href={guest ? "/login?next=/checkout" : "/login?next=/checkout&claim=1"} className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">
            <LogIn className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
            {t("fast.signIn")}
          </Link>
        </div>
      )}

      {blocked && (
        <Card className="mb-4 border-amber-500/30">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} aria-hidden="true" />
            {outOfStock ? tCart("shortageBlock") : t("blocked")}
          </p>
          <Link href="/cart" className="mt-3 inline-block text-sm font-semibold text-primary">{t("backToCart")}</Link>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="min-w-0 space-y-4">
          {/* 1. how to receive */}
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><span className="nz-step">1</span>{t("fast.receive")}</h2>
            <FulfilmentPicker
              method={fulfilment} onMethod={setFulfilment} selectedId={pickupStore?.id ?? null} onSelect={setPickupStore}
              items={preview.items.filter((i) => i.status !== "removed").map((i) => ({ variantId: i.product_variant_id, quantity: i.quantity }))}
              near={guest
                ? place?.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null
                : selectedAddress?.coordinate_latitude != null && selectedAddress.coordinate_longitude != null ? { lat: selectedAddress.coordinate_latitude, lng: selectedAddress.coordinate_longitude } : null}
            />
          </Card>

          {/* 2. who to call */}
          <div ref={contactRef} className="scroll-mt-24">
            <Card>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><span className="nz-step">2</span>{t("fast.contact")}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-semibold text-ink-muted">{t("fast.name")}</span>
                  <input
                    type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("fast.namePlaceholder")} maxLength={120}
                    className={`${INPUT} ${touched && !nameOk ? "!border-red-500/70 ring-1 ring-red-500/30" : ""}`}
                  />
                </label>
                <label className="block min-w-0" htmlFor="checkout-phone">
                  <span className="mb-1 block text-xs font-semibold text-ink-muted">{t("fast.phone")}</span>
                  <PhoneField id="checkout-phone" value={phone} onChange={setPhone} invalid={touched && !fullPhone} />
                </label>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={2} aria-hidden="true" />
                {guest ? t("fast.guestNoAccount") : t("fast.phoneHint")}
              </p>
            </Card>
          </div>

          {/* 3. where */}
          {fulfilment === "delivery" && (
            <div ref={addressRef} className="scroll-mt-24">
              <Card>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><span className="nz-step">3</span>{t("deliveryAddress")}</h2>
                {guest ? (
                  <AddressForm bare compact mode="create" draftRef={draftRef} onSaved={() => undefined} onPlaceChange={(p) => setPlace(p.regionId && p.cityId ? p : null)} />
                ) : (
                  <AddressSelector
                    addresses={addresses} selectedId={selectedAddressId} saveRef={addressSaveRef}
                    onSelect={(id) => {
                      setSelectedAddressId(id);
                      const a = addresses.find((x) => x.id === id);
                      if (a?.recipient_name) setName(a.recipient_name);
                      if (a?.recipient_phone) setPhone(localDigits(a.recipient_phone));
                    }}
                    onCreated={(a) => { setAddresses((prev) => [...prev, a]); setSelectedAddressId(a.id); }}
                  />
                )}
                <div className="mt-3 rounded-xl bg-primary-soft/40 px-3 py-2.5" aria-live="polite">
                  <DeliveryLine preview={preview} pickup={false} />
                </div>
              </Card>
            </div>
          )}
          {fulfilment === "pickup" && <div ref={addressRef} />}

          {/* 4. payment */}
          <PaymentMethodCard methods={paymentMethods} value={effectiveMethod} onChange={setPaymentMethod} amount={payableAmount} pickup={fulfilment === "pickup"} />
          {!guest && preview.loyalty && <CoinRedeemCard loyalty={preview.loyalty} value={effectiveCoins} onChange={setCoinsToRedeem} />}

          {showComment || comment ? (
            <Card>
              <label htmlFor="checkout-comment" className="mb-2 block text-sm font-semibold text-ink-muted">{t("comment")}</label>
              <textarea
                id="checkout-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={500} autoFocus={showComment && !comment}
                placeholder={t("commentPlaceholder")} className="nz-glass-input w-full rounded-xl px-4 py-2.5 text-[16px]"
              />
            </Card>
          ) : (
            <button
              type="button" onClick={() => setShowComment(true)}
              className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-primary/50 hover:text-primary"
            >
              <MessageSquarePlus className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              {t("addComment")}
            </button>
          )}
        </div>

        {/* summary: items, delivery, total -- and the button on wide screens */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <OrderSummary preview={preview} onPreviewChange={refreshPreview} coins={effectiveCoins} pickup={fulfilment === "pickup"} guest={!!guest} noCoins={!!preview?.guest_account}>
            <div className="hidden space-y-2 pt-1 lg:block">
              {error && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
              {confirmButton}
              <p className="text-center text-[11px] leading-snug text-ink-soft">{t("fast.legal")}</p>
            </div>
          </OrderSummary>
          <Link href="/cart" className="mt-2 hidden text-center text-xs font-semibold text-primary lg:block">{t("fast.editCart")}</Link>
        </div>
      </div>

      {/* phones: the total and the one button, always under the thumb */}
      <div
        className="nz-tg-above-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pt-3 shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.35)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {error && <p role="alert" className="mb-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          {payableAmount !== null && preview.total && (
            <div className="shrink-0 leading-tight">
              <p className="text-[11px] font-medium text-ink-soft">{t("total")}</p>
              <p className="whitespace-nowrap text-base font-extrabold tabular-nums text-ink">{formatPrice(String(payableAmount), preview.total.currency)}</p>
            </div>
          )}
          <Button onClick={handlePlaceOrder} disabled={busy || blocked} variant="primary" className="min-w-0 flex-1 whitespace-nowrap py-3.5 text-[15px]">
            {busy && <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" strokeWidth={2} aria-hidden="true" />}
            <span className="truncate">{cta}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

