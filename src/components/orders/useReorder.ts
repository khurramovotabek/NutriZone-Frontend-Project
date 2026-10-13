"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emitCartUpdated } from "@/lib/cart-events";
import type { Order } from "@/lib/orders-api";

type ReorderResult = { kind: "partial"; failed: number } | { kind: "failed" } | null;

/** Adds every active line of an order back to the cart, then opens the cart. Reports lines that couldn't be added (e.g. product no longer sold). */
export function useReorder() {
  const router = useRouter();
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [result, setResult] = useState<{ orderId: string; result: ReorderResult } | null>(null);

  async function reorder(order: Order) {
    if (pendingOrderId) return;
    setPendingOrderId(order.id);
    setResult(null);
    const lines = order.lines.filter((l) => l.status === "active");
    let failed = 0;
    // Sequential on purpose: the cart API serializes writes per cart anyway.
    for (const line of lines) {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_variant_id: line.product_variant_id, quantity: line.quantity }),
        });
        if (!res.ok) failed += 1;
      } catch {
        failed += 1;
      }
    }
    setPendingOrderId(null);
    if (failed < lines.length) emitCartUpdated();
    if (failed === lines.length) {
      setResult({ orderId: order.id, result: { kind: "failed" } });
    } else if (failed > 0) {
      // Stay on the page so the warning is seen; the message links to the cart.
      setResult({ orderId: order.id, result: { kind: "partial", failed } });
    } else {
      router.push("/cart");
    }
  }

  return { reorder, pendingOrderId, resultFor: (orderId: string) => (result?.orderId === orderId ? result.result : null) };
}
