/** Shared by the new checkout components (OrderItem/OrderSummary/CheckoutReview) -- rounds to whole units, matching this project's own existing ProductCard/ProductPurchaseExperience convention for UZS-style pricing. */
export function formatMoney(amount: string | number | null | undefined, currency: string | null | undefined): string | null {
  if (amount === null || amount === undefined || !currency) return null;
  const rounded = Math.round(Number(amount));
  if (Number.isNaN(rounded)) return null;
  return `${rounded.toLocaleString("en-US")} ${currency}`;
}
