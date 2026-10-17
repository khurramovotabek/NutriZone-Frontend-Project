"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ProductCard } from "@/lib/api";
import { Button, Select } from "@/components/ui";
import VariantSelector from "@/components/VariantSelector";
import { emitCartUpdated } from "@/lib/cart-events";
import { addToCart, priceLine } from "@/lib/cart-client";
import { cartActionNeedsLogin } from "@/lib/cart-errors";

type Variant = NonNullable<ProductCard["variants"]>[number];

interface Props {
  variants: Variant[];
  /** Controlled mode -- lets a parent (e.g. ProductPurchaseExperience) keep gallery/price/stock in sync with the same selected variant. Omit either to fall back to this component managing its own selection standalone. */
  selectedId?: string;
  onSelectVariant?: (variantId: string) => void;
  /** Product-level price/currency fallback for a variant with no price of its own -- mirrors the exact `selected?.price ?? product.price` fallback both callers already use to decide what to *display*, so the purchase buttons below never disagree with the price shown just above them. */
  fallbackPrice?: string | null;
  fallbackCurrency?: string | null;
}

type FlowState = "idle" | "adding" | "pricing" | "success" | "error" | "buying";

export default function AddToCartForm({ variants, selectedId, onSelectVariant, fallbackPrice = null, fallbackCurrency = null }: Props) {
  const router = useRouter();
  const t = useTranslations("product");
  const purchasableVariants = variants.filter((v) => v.status === "active");
  const [internalVariantId, setInternalVariantId] = useState<string>(() => {
    const initial = purchasableVariants.find((v) => v.is_default) ?? purchasableVariants[0];
    return initial?.id ?? "";
  });
  // A single purchasable variant is always the selection.
  const variantId = purchasableVariants.length === 1 ? purchasableVariants[0].id : (selectedId ?? internalVariantId);
  const setVariantId = onSelectVariant ?? setInternalVariantId;
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<FlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [unitAmount, setUnitAmount] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  // Synchronous guard against a duplicate add-to-cart request -- see
  // AddToCartButton.tsx's identical `submittingRef` for why `state` alone
  // isn't a reliable guard against two clicks/taps landing before React
  // commits the first one's state update.
  const submittingRef = useRef(false);

  if (purchasableVariants.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
        {t("unavailable")}
      </p>
    );
  }

  // Real, closed gap: the "current selling price" the customer sees above
  // this form and the price actually resolved server-side at add-to-cart
  // time (POST .../items/{id}/price) come from the exact same source (the
  // active PriceList's entry for this variant) -- so a null price here is
  // a reliable, existing signal that the server call will fail with
  // RESOURCE_NOT_FOUND too, not a guess. Gating the buttons on it means
  // the buy box never shows "Price unavailable" right above a fully
  // working "Add to Cart" button.
  const selectedVariant = purchasableVariants.find((v) => v.id === variantId);
  const effectivePrice = selectedVariant?.price ?? fallbackPrice;
  const effectiveCurrency = selectedVariant?.currency ?? fallbackCurrency;
  const canPurchase = Boolean(effectivePrice && effectiveCurrency && !Number.isNaN(Number(effectivePrice)));
  // Stock 0 for the selected variant -> nothing to sell; never let it reach the cart.
  const selectedOutOfStock = selectedVariant?.stock_status === "out_of_stock" || selectedVariant?.stock_quantity === 0;
  const maxQuantity = typeof selectedVariant?.stock_quantity === "number" && selectedVariant.stock_quantity > 0 ? selectedVariant.stock_quantity : Infinity;

  /** Shared by both "Add to Cart" and "Buy Now" -- the real add-then-price
   * flow is identical either way; only what happens after success differs
   * (stay on the page vs. go straight to checkout). Returns true on success. */
  async function addAndPrice(busyState: "adding" | "buying"): Promise<boolean> {
    if (!variantId || quantity < 1 || state === "adding" || state === "pricing" || state === "buying" || submittingRef.current) return false;
    submittingRef.current = true;
    setState(busyState);
    setError(null);
    setUnitAmount(null);

    try {
      const { res: addRes, body: addBody, line: newItem } = await addToCart(variantId, quantity);

      if (!addRes.ok || !addBody.success) {
        if (addRes.status === 401) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return false;
        }
        setError(addBody.error?.message ?? t("addError"));
        setState("error");
        return false;
      }

      emitCartUpdated();
      // The line holding this variant -- re-adding a product grows its existing line, which isn't always the last one.
      if (!newItem) return true;

      // Guest shopper: the line is in their guest cart -- done. Pricing
      // needs a signed-in customer and happens automatically right after
      // they sign in at checkout (see /api/checkout/preview), so there is
      // no sign-in wall here.
      if (!addBody.meta?.authenticated) return true;

      if (busyState === "adding") setState("pricing");

      const { res: priceRes, body: priceBody } = await priceLine(newItem.id);

      if (!priceRes.ok || !priceBody.success) {
        // Real, closed gap: a guest visitor's "Add to Cart" click on this
        // page succeeds at the add step (guest carts are allowed), then
        // fails here every time -- pricing a cart item genuinely requires
        // a signed-in customer (backend's CanAttachPriceSnapshot has no
        // `allow_anonymous`). This used to fall through to the generic
        // error branch below, showing the Next.js route's own hardcoded,
        // un-localized "Please log in." text with no way to act on it.
        // Routes exactly like the add step's own 401 case just above.
        if (cartActionNeedsLogin(priceBody.error?.code)) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return false;
        }
        // Real, closed gap: this used to always show one generic string
        // regardless of cause, making a legitimate "no price configured
        // for this product yet" business response (RESOURCE_NOT_FOUND,
        // from the backend's own IssueVariantPriceSnapshot) indistinguishable
        // from a real network/permission failure. Surface the backend's
        // own message when it has one, same as the add-to-cart branch
        // above already does.
        setError(priceBody.error?.code === "RESOURCE_NOT_FOUND" ? t("priceNotConfigured") : (priceBody.error?.message ?? t("priceError")));
        setState("error");
        return false;
      }

      const pricedItem = priceBody.data?.items.find((i) => i.id === newItem.id);
      setUnitAmount(pricedItem?.price_reference?.unit_amount ?? null);
      setCurrency(pricedItem?.price_reference?.currency ?? null);
      return true;
    } catch {
      setError(t("networkError"));
      setState("error");
      return false;
    } finally {
      submittingRef.current = false;
    }
  }

  async function handleAddToCart() {
    const ok = await addAndPrice("adding");
    if (ok) {
      setState("success");
      router.refresh();
    }
  }

  async function handleBuyNow() {
    const ok = await addAndPrice("buying");
    if (ok) router.push("/checkout");
  }

  const busy = state === "adding" || state === "pricing" || state === "buying";
  // Size x flavour families pick by size and flavour; only a product with neither recorded falls back to a SKU list.
  const hasWeightData = purchasableVariants.filter((v) => v.weight_value !== null).length >= 2 || new Set(purchasableVariants.map((v) => v.flavour?.id).filter(Boolean)).size >= 2;

  return (
    <div className="mt-6 space-y-4">
      {purchasableVariants.length > 1 &&
        (hasWeightData ? (
          <VariantSelector variants={purchasableVariants} selectedId={variantId} onChange={setVariantId} disabled={busy} />
        ) : (
          // Fallback for a product whose Size (weight) data hasn't been
          // entered yet -- SKU is the only real, non-fabricated label
          // available, so it's still a plain list rather than a broken UI.
          <div>
            <label htmlFor="variant" className="mb-1 block text-sm font-medium text-ink-muted">
              {t("variant")}
            </label>
            <Select id="variant" value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={busy} className="rounded-lg py-2.5 pl-4 pr-9">
              {purchasableVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.sku}
                </option>
              ))}
            </Select>
          </div>
        ))}

      {/* One decision row: how many + add to cart; "buy now" right under it. */}
      {selectedOutOfStock ? (
        <Button disabled variant="secondary" className="w-full">
          {t("outOfStock")}
        </Button>
      ) : canPurchase ? (
        <div className="space-y-2">
          <div className="flex items-stretch gap-2">
            <div className="nz-glass-input inline-flex shrink-0 items-center rounded-xl" role="group" aria-label={t("quantity")}>
              <button
                type="button"
                disabled={busy || quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label={t("decreaseQuantity")}
                className="flex h-12 w-10 items-center justify-center text-lg text-ink-muted transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
              >
                &minus;
              </button>
              <input
                id="quantity"
                type="number"
                min={1}
                step={1}
                value={quantity}
                disabled={busy}
                aria-label={t("quantity")}
                onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
                className="w-10 bg-transparent px-0 py-2.5 text-center text-base font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                disabled={busy || quantity >= maxQuantity}
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                aria-label={t("increaseQuantity")}
                className="flex h-12 w-10 items-center justify-center text-lg text-ink-muted transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
              >
                +
              </button>
            </div>
            <Button onClick={handleAddToCart} disabled={busy || !variantId} variant="primary" className="min-h-12 flex-1 text-base">
              {state === "adding" ? t("adding") : state === "pricing" ? t("confirmingPrice") : t("addToCart")}
            </Button>
          </div>
          <Button onClick={handleBuyNow} disabled={busy || !variantId} variant="secondary" className="w-full">
            {state === "buying" ? t("redirectingToCheckout") : t("buyNow")}
          </Button>
        </div>
      ) : (
        // Never imply a purchase is possible when the backend has no price to confirm it with.
        <Button disabled variant="primary" className="w-full">
          {t("purchaseUnavailableButton")}
        </Button>
      )}

      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {state === "success" && (
        <p role="status" aria-live="polite" className="text-sm text-success">
          {unitAmount ? t("addedWithPrice", { amount: unitAmount, currency: currency ?? "" }) : t("addedSimple")}
        </p>
      )}
    </div>
  );
}
