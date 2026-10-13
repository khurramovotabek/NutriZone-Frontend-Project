import BestSellersSection from "@/components/BestSellersSection";
import CartView from "@/components/cart/CartView";

/** An empty cart is a dead end -- it gets the store's best sellers underneath, so the shopper has somewhere to go. */
export default function CartPage() {
  return <CartView emptyRecommendations={<div className="mx-auto max-w-7xl px-4 pb-10"><BestSellersSection /></div>} />;
}
