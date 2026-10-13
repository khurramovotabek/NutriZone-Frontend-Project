"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ShoppingCart, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CheckoutPreview } from "@/lib/cart-api";
import type { Address } from "@/lib/geo-api";
import { splitFullName, joinName } from "@/lib/name-utils";
import { emitCartUpdated } from "@/lib/cart-events";
import { Button, Card, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import CheckoutStepper, { type CheckoutStep } from "@/components/checkout/CheckoutStepper";
import AddressSelector from "@/components/checkout/AddressSelector";
import RecipientForm from "@/components/checkout/RecipientForm";
import PaymentMethodCard, { withinLimits } from "@/components/checkout/PaymentMethodCard";
import type { PaymentMethod, PaymentMethodKey } from "@/lib/payments-api";
import OrderSummary from "@/components/checkout/OrderSummary";
import CheckoutReview from "@/components/checkout/CheckoutReview";
import CoinRedeemCard from "@/components/checkout/CoinRedeemCard";
import FulfilmentPicker, { type PickupOption } from "@/components/checkout/FulfilmentPicker";

const COIN_ERROR_CODES = new Set(["INSUFFICIENT_COINS", "REDEEM_ABOVE_LIMIT", "REDEEM_BELOW_MINIMUM", "REDEEM_DISABLED"]);

type CheckoutProfile = { full_name: string; phone_number: string; telegram_username: string | null };

function recipientFromAddress(address: Address, owner: CheckoutProfile | null) {
  const { firstName, lastName } = splitFullName(address.recipient_name || owner?.full_name);
  return {
    firstName,
    lastName,
    phone: address.recipient_phone || owner?.phone_number || "",
    telegramUsername: address.recipient_telegram_username || owner?.telegram_username || "",
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const locale = useLocale();

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [profile, setProfile] = useState<CheckoutProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<CheckoutStep>("delivery");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [comment, setComment] = useState("");
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [pickupStore, setPickupStore] = useState<PickupOption | null>(null);

  const [coinsToRedeem, setCoinsToRedeem] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("cash");
  const [redirecting, setRedirecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function refreshPreview() {
    const res = await fetch("/api/checkout/preview");
    const body = await res.json();
    if (body.success) setPreview(body.data);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/checkout/preview").then((res) => res.json()),
      fetch("/api/addresses").then((res) => res.json()),
      fetch("/api/profile").then((res) => res.json()),
      fetch("/api/payments/methods").then((res) => res.json()).catch(() => null),
    ])
      .then(([previewBody, addressesBody, profileBody, methodsBody]) => {
        if (methodsBody?.success && Array.isArray(methodsBody.data)) setPaymentMethods(methodsBody.data);
        if (!previewBody.success) {
          setLoadError(previewBody.error?.code === "NO_SESSION" ? "login" : "load");
          return;
        }
        setPreview(previewBody.data);

        const list: Address[] = addressesBody.success ? addressesBody.data : [];
        setAddresses(list);

        const owner: CheckoutProfile | null = profileBody.success
          ? { full_name: profileBody.data.full_name, phone_number: profileBody.data.phone_number, telegram_username: profileBody.data.telegram_username }
          : null;
        setProfile(owner);

        const preferred = list.find((a) => a.is_default) ?? list[0];
        if (preferred) {
          const recipient = recipientFromAddress(preferred, owner);
          setSelectedAddressId(preferred.id);
          setFirstName(recipient.firstName);
          setLastName(recipient.lastName);
          setPhone(recipient.phone);
          setTelegramUsername(recipient.telegramUsername);
        } else if (profileBody.success) {
          // Real Telegram/profile-derived prefill: no saved address yet,
          // so this is the only real source for name/phone/Telegram
          // username (see name-utils.ts -- first/last is a UI-only
          // split of one real combined field).
          const { firstName: fn, lastName: ln } = splitFullName(profileBody.data.full_name);
          setFirstName(fn);
          setLastName(ln);
          setPhone(profileBody.data.phone_number ?? "");
          setTelegramUsername(profileBody.data.telegram_username ?? "");
        }
      })
      .catch(() => setLoadError("network"))
      .finally(() => setLoading(false));
  }, []);

  // Real backend precedence (mirrors CheckoutCartView's own
  // `_address_snapshot()`, confirmed directly against
  // apps/cart/interfaces/api/v1/views.py): the selected address's own
  // recipient_name/recipient_phone/recipient_telegram_username take
  // priority (who this specific delivery is actually for -- may
  // differ from the account holder, e.g. a gift); falls back to the
  // authenticated user's own real profile only when the address has
  // none. Selecting a different address always re-syncs this form to
  // THAT address's real, stored recipient info.
  function selectAddress(selected: Address) {
    const recipient = recipientFromAddress(selected, profile);
    setSelectedAddressId(selected.id);
    setFirstName(recipient.firstName);
    setLastName(recipient.lastName);
    setPhone(recipient.phone);
    setTelegramUsername(recipient.telegramUsername);
  }

  function handleAddressSelected(addressId: string) {
    if (addressId === selectedAddressId) return;
    const selected = addresses.find((a) => a.id === addressId);
    if (selected) selectAddress(selected);
  }

  function handleAddressCreated(address: Address) {
    setAddresses((prev) => [...prev, address]);
    selectAddress(address);
  }

  function validateStep1(): boolean {
    if (fulfilment === "pickup" && !pickupStore) {
      setStep1Error(t("fulfilment.chooseStoreError"));
      return false;
    }
    if (fulfilment === "delivery" && !selectedAddressId) {
      setStep1Error(t("validation.addressRequired"));
      return false;
    }
    if (!firstName.trim()) {
      setStep1Error(t("validation.firstNameRequired"));
      return false;
    }
    if (!/^\+?\d{9,15}$/.test(phone.replace(/[\s()-]/g, ""))) {
      setStep1Error(t("validation.invalidPhone"));
      return false;
    }
    setStep1Error(null);
    return true;
  }

  /**
   * Real, existing capability: UpdateAddressSerializer accepts
   * recipient_name/recipient_phone/recipient_telegram_username
   * (confirmed directly against apps/geo/interfaces/api/v1/
   * serializers.py) -- an edited recipient is saved in place onto the
   * selected address via PATCH, never by creating a duplicate address
   * record at the same location for a trivial name/phone correction.
   */
  async function resolveShippingAddressId(): Promise<string | null> {
    const selected = addresses.find((a) => a.id === selectedAddressId);
    if (!selected) return null;

    const nextRecipientName = joinName(firstName, lastName);
    const nextRecipientPhone = phone.trim();
    const nextTelegramUsername = telegramUsername.trim();
    const recipientChanged =
      nextRecipientName !== (selected.recipient_name ?? "").trim() ||
      nextRecipientPhone !== (selected.recipient_phone ?? "").trim() ||
      nextTelegramUsername !== (selected.recipient_telegram_username ?? "").trim();
    if (!recipientChanged) return selected.id;

    const res = await fetch(`/api/addresses/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientName: nextRecipientName, recipientPhone: nextRecipientPhone, recipientTelegramUsername: nextTelegramUsername }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) return null;
    const updated: Address = body.data;
    setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    return updated.id;
  }

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const shippingAddressId = fulfilment === "delivery" ? await resolveShippingAddressId() : "";
      if (fulfilment === "delivery" && !shippingAddressId) {
        setSubmitError(t("addressError"));
        return;
      }

      if (comment.trim()) {
        // Best-effort: a real, existing Cart.note field (see
        // updateCartNote in cart-api.ts), but never propagated onto the
        // created Order by the backend (confirmed -- CheckoutCartView
        // never reads cart.note). A failure here is not allowed to
        // block an otherwise-valid checkout.
        await fetch("/api/cart", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: comment.trim() }) }).catch(() => {});
      }

      const checkoutRes = await fetch("/api/checkout/submit", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          shippingAddressId, fulfilmentMethod: fulfilment, pickupStoreId: fulfilment === "pickup" ? pickupStore?.id : undefined,
          coinsToRedeem: preview?.loyalty ? Math.min(coinsToRedeem, preview.loyalty.max_redeemable) : 0,
        }),
      });
      const checkoutBody = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutBody.success) {
        // Real order creation failed -- the cart is never touched, and
        // the customer stays right here with every item still intact.
        const coinError = COIN_ERROR_CODES.has(checkoutBody.error?.code) ? t(`coins.errors.${checkoutBody.error.code}`) : null;
        if (coinError) {
          setCoinsToRedeem(0);
          await refreshPreview();
        }
        setSubmitError(coinError ?? checkoutBody.error?.message ?? t("checkoutError"));
        return;
      }

      // The order now exists for real -- only now is the cart cleared,
      // never before. Best-effort: a failure here must not strand the
      // customer on an already-completed order, but every cart-mutating
      // call site in this app fires emitCartUpdated() immediately after
      // a server-confirmed success, so the header badge/cart page never
      // show a stale count once this succeeds.
      await fetch("/api/cart/clear", { method: "POST" })
        .then((res) => (res.ok ? emitCartUpdated() : undefined))
        .catch(() => {});

      const orderNumber = checkoutBody.data.order_number;
      const chosen = paymentMethods.find((m) => m.key === paymentMethod);
      const coinsUsed = preview?.loyalty ? Math.min(coinsToRedeem, preview.loyalty.max_redeemable) : 0;
      const amountDue = preview?.total ? Math.max(0, Number(preview.total.amount) - coinsUsed) : null;
      if (chosen?.online && chosen.available && withinLimits(chosen, amountDue)) {
        // The order exists; now hand the customer to the provider's secure page. If that fails, the order page offers "Pay online" again.
        setRedirecting(true);
        const payRes = await fetch(`/api/payments/orders/${encodeURIComponent(orderNumber)}/pay`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: chosen.key, lang: locale }),
        }).catch(() => null);
        const payBody = payRes ? await payRes.json().catch(() => null) : null;
        if (payBody?.success && payBody.data?.checkout_url) {
          window.location.assign(payBody.data.checkout_url);
          return;
        }
        setRedirecting(false);
        router.push(`/orders/${orderNumber}?success=1&payment=failed`);
        return;
      }
      router.push(`/orders/${orderNumber}?success=1`);
    } catch {
      setSubmitError(t("networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (loadError) {
    const message = loadError === "login" ? t("loginPrompt") : loadError === "network" ? t("networkError") : t("loadError");
    return (
      <ErrorState
        message={message}
        action={
          loadError === "login" && (
            <Link href="/login?next=/checkout">
              <Button variant="primary">{t("goToLogin")}</Button>
            </Link>
          )
        }
      />
    );
  }

  if (!preview) return null;

  // An empty cart is not an error: say so and send the shopper back to the catalogue.
  if (preview.issues.some((issue) => issue.code === "empty_cart")) {
    return (
      <EmptyState
        icon={<ShoppingCart strokeWidth={1.5} aria-hidden="true" />}
        title={tCart("emptyTitle")}
        description={tCart("emptyDescription")}
        action={
          <Link href="/products">
            <Button variant="primary">{tCart("continueShopping")}</Button>
          </Link>
        }
      />
    );
  }

  // The cap can shrink after the customer picked an amount (e.g. a coupon lowers the total) -- always honour the latest server limit.
  const effectiveCoins = preview.loyalty ? Math.min(coinsToRedeem, preview.loyalty.max_redeemable) : 0;
  const payableAmount = preview.total ? Math.max(0, Number(preview.total.amount) - effectiveCoins) : null;
  // A method that became unavailable (or out of its limits after coins/coupon) falls back to cash on delivery.
  const pickedMethod = paymentMethods.find((m) => m.key === paymentMethod);
  const effectiveMethod: PaymentMethodKey = pickedMethod && pickedMethod.available && withinLimits(pickedMethod, payableAmount) ? paymentMethod : "cash";

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;
  const notReady = preview.readiness !== "ready";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label={t("breadcrumbLabel")} className="mb-4 flex items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/cart" className="transition-colors hover:text-primary">
          {t("breadcrumbCart")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-ink-muted">{t("title")}</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("title")}</h1>

      <CheckoutStepper current={step} />

      {notReady ? (
        <Card className="border-amber-500/30">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} aria-hidden="true" />
            {preview.readiness === "blocked" ? t("blocked") : t("notReady")}
          </p>
          {preview.issues.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {preview.issues.map((issue, i) => (
                <li key={i} className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-ink">
                  {t.has(`issues.${issue.code}`) ? t(`issues.${issue.code}`) : issue.message}
                </li>
              ))}
            </ul>
          )}
          <Link href="/cart" className="mt-4 inline-block text-sm font-semibold text-primary transition-colors hover:brightness-110">
            {t("backToCart")}
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {step === "delivery" && (
              <>
                <Card>
                  <h2 className="mb-4 text-sm font-semibold text-ink-muted">{t("recipientInfo")}</h2>
                  <RecipientForm
                    firstName={firstName} lastName={lastName} phone={phone} telegramUsername={telegramUsername}
                    onFirstNameChange={setFirstName} onLastNameChange={setLastName} onPhoneChange={setPhone} onTelegramUsernameChange={setTelegramUsername}
                  />
                  {selectedAddress && <p className="mt-2 text-xs text-ink-soft">{t("recipientEditHint")}</p>}
                </Card>

                <Card>
                  <h2 className="mb-4 text-sm font-semibold text-ink-muted">{t("fulfilment.label")}</h2>
                  <FulfilmentPicker
                    method={fulfilment} onMethod={setFulfilment} selectedId={pickupStore?.id ?? null} onSelect={setPickupStore}
                    items={preview.items.filter((i) => i.status !== "removed").map((i) => ({ variantId: i.product_variant_id, quantity: i.quantity }))}
                    near={selectedAddress?.coordinate_latitude != null && selectedAddress.coordinate_longitude != null ? { lat: selectedAddress.coordinate_latitude, lng: selectedAddress.coordinate_longitude } : null}
                  />
                </Card>

                {fulfilment === "delivery" && (
                  <Card>
                    <h2 className="mb-4 text-sm font-semibold text-ink-muted">{t("deliveryAddress")}</h2>
                    <AddressSelector addresses={addresses} selectedId={selectedAddressId} onSelect={handleAddressSelected} onCreated={handleAddressCreated} />
                  </Card>
                )}

                <Card>
                  <h2 className="mb-2 text-sm font-semibold text-ink-muted">{t("comment")}</h2>
                  <textarea
                    value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={500}
                    placeholder={t("commentPlaceholder")} className="nz-glass-input w-full rounded-lg px-4 py-2.5 text-sm"
                  />
                  <p className="mt-1 text-xs text-ink-soft">{t("commentLimitation")}</p>
                </Card>

                {step1Error && (
                  <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                    {step1Error}
                  </p>
                )}

                <Button onClick={() => validateStep1() && setStep("payment")} variant="primary" className="w-full sm:w-auto">
                  {t("continueToPayment")}
                </Button>
              </>
            )}

            {step === "payment" && (
              <>
                <PaymentMethodCard methods={paymentMethods} value={effectiveMethod} onChange={setPaymentMethod} amount={payableAmount} pickup={fulfilment === "pickup"} />
                {preview.loyalty && <CoinRedeemCard loyalty={preview.loyalty} value={effectiveCoins} onChange={setCoinsToRedeem} />}
                <div className="flex gap-3">
                  <Button onClick={() => setStep("delivery")} variant="ghost">
                    {t("back")}
                  </Button>
                  <Button onClick={() => setStep("review")} variant="primary">
                    {t("continueToReview")}
                  </Button>
                </div>
              </>
            )}

            {step === "review" && (fulfilment === "pickup" ? !!pickupStore : !!selectedAddress) && (
              <CheckoutReview
                address={fulfilment === "pickup" ? null : selectedAddress}
                pickupStore={fulfilment === "pickup" && pickupStore ? { name: pickupStore.name, address: pickupStore.address, today: pickupStore.today } : null}
                recipientName={joinName(firstName, lastName)}
                recipientPhone={phone}
                recipientTelegramUsername={telegramUsername}
                comment={comment}
                preview={preview}
                onEditDelivery={() => setStep("delivery")}
                onEditPayment={() => setStep("payment")}
                onConfirm={handleConfirm}
                submitting={submitting}
                submitError={submitError}
                coins={effectiveCoins}
                paymentMethod={paymentMethods.find((m) => m.key === effectiveMethod) ?? null}
                redirecting={redirecting}
              />
            )}
          </div>

          {step !== "review" && (
            <div className="lg:sticky lg:top-6 lg:h-fit">
              <OrderSummary preview={preview} onPreviewChange={refreshPreview} showCoupon={step === "delivery"} coins={effectiveCoins} pickup={fulfilment === "pickup"} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
