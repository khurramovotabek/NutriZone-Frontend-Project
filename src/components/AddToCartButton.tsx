"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Ban, Loader2, ShoppingCart, Check } from "lucide-react";
import { addAndPrice } from "@/lib/cart-client";

interface Props {
  variantId: string;
  className?: string;
  /** Stock is 0 -- the button renders as a disabled "Out of stock" pill and never calls the API. */
  outOfStock?: boolean;
  /** No purchasable variant at all (e.g. a published product with no SKU yet) -- same pill, "Not available" label. */
  unavailable?: boolean;
}

/**
 * Real, product-required capability: lets a not-logged-in visitor add
 * a product straight from the Product List/Catalog page, without
 * navigating to the detail page first. Calls the same /api/cart route
 * the cart page itself uses -- no login required (backend's guest
 * cart mechanism, ownership enforced by an opaque cart token stored
 * in an HttpOnly cookie, never by the JWT session).
 *
 * Guest flow: the line is added to the guest cart and that's it -- no
 * sign-in prompt here. Server-side pricing needs a signed-in customer,
 * so it's deferred to checkout (see /api/checkout/preview, which prices
 * every unpriced line right after the shopper signs in).
 */
export default function AddToCartButton({ variantId, className = "", outOfStock = false, unavailable = false }: Props) {
  const t = useTranslations("catalog");
  const tProduct = useTranslations("product");
  const [state, setState] = useState<"idle" | "pending" | "added" | "error">("idle");
  // Synchronous guard against a duplicate add-to-cart request -- `state`
  // alone doesn't take effect until React commits the next render, so two
  // rapid clicks/taps that both land before that commit can both read
  // `state !== "pending"` and both fire a request. See LoginCodeForm.tsx
  // for the identical, previously-fixed pattern.
  const submittingRef = useRef(false);

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (state === "pending" || submittingRef.current) return;
    submittingRef.current = true;
    setState("pending");

    try {
      // Queued with every other cart write and priced on the line that really holds this variant.
      const result = await addAndPrice(variantId, 1);
      if (!result.ok) {
        setState("error");
        setTimeout(() => setState("idle"), 2000);
        return;
      }

      setState("added");
      // addAndPrice already told the header badge; a full router.refresh() here only re-rendered the whole catalog page.
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    } finally {
      submittingRef.current = false;
    }
  }

  if (outOfStock || unavailable || !variantId) {
    return (
      // A non-interactive status pill, not a disabled <button>: the card
      // itself stays a link to the product page, only buying is blocked.
      <span
        role="status"
        className={`flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-soft ${className}`}
      >
        <Ban className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        {outOfStock ? tProduct("outOfStock") : tProduct("notAvailableShort")}
      </span>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={state === "pending"}
        aria-label={t("addToCart")}
        className={`nz-cta nz-shimmer-btn group/cart flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 ease-out hover:-translate-y-px disabled:pointer-events-none disabled:opacity-70 ${className}`}
      >
        {state === "added" ? (
          <>
            <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {t("added")}
          </>
        ) : state === "pending" ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden="true" />
            {t("adding")}
          </>
        ) : (
          <>
            <ShoppingCart className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover/cart:translate-x-0.5" strokeWidth={1.75} aria-hidden="true" />
            {t("addToCart")}
          </>
        )}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-1 text-center text-[11px] text-red-600 dark:text-red-400">
          {t("addError")}
        </p>
      )}
    </div>
  );
}
